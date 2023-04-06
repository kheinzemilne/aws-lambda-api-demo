import { 
    APIGatewayProxyEvent, 
    APIGatewayProxyResult } 
  from "aws-lambda/trigger/api-gateway-proxy";
import { createDB, createTable, Database, insert, insertMany, many, one, remove, Table } from "blinkdb";
import { StringifyOptions } from "querystring";
import { json } from "stream/consumers";

  interface Cat {
    id: number
    name: string
    color?: string
    birth_date: Date
    favourite_food?: string
    owner?: string
  }

  interface CatDto {
    name: string
    color? : string
    birth_date: string
    favourite_food?: string
    owner?: string
  }

  interface CatListItem {
    id: number
    name: string
  }

  // global vars to persist database across lambda invocations
  let blinkdb: Database
  let catTable: Table<Cat, "id">
  // BlinkDB doesn't support auto-incrementing numeric ids yet, so we need to track it manually
  let nextPK: number

  export const lambdaHandler = async (
     event: APIGatewayProxyEvent
  ): Promise<APIGatewayProxyResult> => {
    setupBlinkDb()

    if (event != null) {
      switch (event.httpMethod) {
        case "GET": {
          return handleGet(event)
        }
        case "POST": {
          return handlePost(event)
        }
        case "DELETE": {
          return handleDelete(event)
        }
        default: {
          return {
            statusCode: 405,
            body: JSON.stringify({'error': 'Invalid HTTP method ' + event.httpMethod + '.'})
          }
        }
      }
    } else {
      return {
        statusCode: 400,
        body: JSON.stringify({"error": "Event is null."})
      }
    }    
  }

  async function handleGet(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    if (event.path.includes("/api/cat/single/")) {
      return await getCatById(event)
    } else if (event.path.includes("/api/cat/list/")) {
      return getCatList()
    } else {
      return {
        statusCode: 400,
        body: JSON.stringify({"error": "Invalid request."})
      }
    }
  }

  async function handlePost(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    if (event.body != null) {
      const cat: CatDto = JSON.parse(event.body)

      const validateResponse: APIGatewayProxyResult | null = validateCatPost(cat)

      if (validateResponse !== null) {
        return validateResponse
      }      

      return await insertCat(cat)
    } else {
      return {
        statusCode: 400,
        body: JSON.stringify({'error': 'No body found.'})
      }
    }
  }

  function validateCatPost(cat: CatDto): APIGatewayProxyResult | null {
    if (!cat.name) {
      return {
        statusCode: 400,
        body: JSON.stringify({'error': 'Missing name in cat.'})
      }
    }
    
    if (!cat.birth_date) {
      return {
        statusCode: 400,
        body: JSON.stringify({'error': 'Missing birth_date in cat.'})
      }
    }

    const reStr = /^\d{4}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])$/
    if (!reStr.test(cat.birth_date)) {
      return {
        statusCode: 400,
        body: JSON.stringify({"error": "Invalid birth date. Must be in yyyy-mm-dd format."})
      }
    }

    return null
  }

  async function insertCat(catDto: CatDto): Promise<APIGatewayProxyResult> {
    var exception: APIGatewayProxyResult | null = null

    const cat: Cat = {
      id: nextPK, 
      name: catDto.name, 
      color: catDto.color, 
      birth_date: new Date(catDto.birth_date), 
      favourite_food: catDto.favourite_food, 
      owner: catDto.owner
    }

    await insert(catTable, cat).catch(ex =>
      exception ={
        statusCode: 400,
        body: JSON.stringify({"error": ex})
      }
    )

    if (exception !== null) {
      return exception
    } else {
      nextPK++
    }

    return {
      statusCode: 201,
      body: JSON.stringify({"msg": "Cat record inserted."})
    }
  }

  async function handleDelete(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    if (event.pathParameters != null) {
      const { id } = event.pathParameters

      if (id != null) {
        if (isNaN(+id)) {
          return {
            statusCode: 400,
            body: JSON.stringify({"error": "Id must be numeric."})
          }
        }

        return await deleteCat(parseInt(id))
      } else {
        return {
          statusCode: 400,
          body: JSON.stringify({"error": "Id is null."})
        }
      }
    } else {
      // this will never happen in practice, as ApiGateway will filter requests with missing Ids
      return {
        statusCode: 400,
        body: JSON.stringify({"error": "Missing id parameter in request."})
      }
    }
  }

  async function deleteCat(id: number): Promise<APIGatewayProxyResult> {
    var exception: APIGatewayProxyResult | null = null

    await remove(catTable, {id: id}).catch(ex =>
      exception = {
        statusCode: 400,
        body: JSON.stringify({"error": ex})
      }
    )

    if (exception !== null) {
      return exception
    }

    return {
      statusCode: 200,
      body: JSON.stringify({"message": "Deleted cat " + id})
    }
  }

  async function getCatById(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    if (event.pathParameters != null) {
      const { id } = event.pathParameters

      if (id != null) {
        if (id == "") {
          return {
            statusCode: 400,
            body: JSON.stringify({"error": "Id is missing."})
          }
        }

        if (isNaN(+id)) {
          return {
            statusCode: 400,
            body: JSON.stringify({"error": "Id must be numeric."})
          }
        }

        let cat: Cat | null = null
        var exception: APIGatewayProxyResult | null = null
        
        await one(catTable, {where: {id: parseInt(id)}})
          .then(it => cat = it)
          .catch(ex => 
            exception = { 
              statusCode: 400, 
              body: JSON.stringify({"error": ex.toString()}) 
            }
          )

        if (exception !== null) {
          return exception
        }
        
        if (cat != null) {
          return {
            statusCode: 200,
            body: JSON.stringify({"cat": cat})
          }
        } else {
          return {
            statusCode: 404,
            body: JSON.stringify({"error": "Cat " + id + " not found."})
          }
        }        
      } else {
        return {
          statusCode: 400,
          body: JSON.stringify({"error": "Id is null."})
        }
      }
    } else {
      // this will never happen in practice, as ApiGateway will filter requests with missing Ids
      return {
        statusCode: 400,
        body: JSON.stringify({"error": "Missing id parameter in request."})
      }
    }  
  }

  async function getCatList(): Promise<APIGatewayProxyResult> {
    var catList: Cat[] = []
    var exception: APIGatewayProxyResult | null = null
    
    await many(catTable).catch(ex => {return ex})
      .then(it => catList = it)
      .catch(ex => 
        exception = { 
          statusCode: 400, 
          body: JSON.stringify({"error": ex.toString()}) 
        }
      )

    if (exception !== null) {
      return exception
    }

    const resultList: CatListItem[] = []

    if (catList.length != 0) {      
      catList.forEach(it => {
        resultList.push({id: it.id, name: it.name})
      })
    }

    return {
      statusCode: 200,
      body: JSON.stringify({"cat_list": resultList})
    }
  }

  function setupBlinkDb(): void {
    if (!blinkdb) {
      blinkdb = createDB()

      catTable = createTable<Cat>(blinkdb, "cats")()

      insertMany(catTable, [
        {id: 1, name: "Wulfgar", color: "Grey", birth_date: new Date("2020-07-01"), favourite_food: "Tuna", owner: "Kira"},
        {id: 2, name: "Teddy", color: "Spotted", birth_date: new Date("2014-03-04"), favourite_food: "Kibble", owner: "Maddie"}
      ])

      nextPK = 3
    }
  }