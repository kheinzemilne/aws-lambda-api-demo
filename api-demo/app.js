"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.lambdaHandler = void 0;
const blinkdb_1 = require("blinkdb");
// global vars to persist database across lambda invocations
let blinkdb;
let catTable;
// BlinkDB doesn't support auto-incrementing numeric ids yet, so we need to track it manually
let nextPK;
const lambdaHandler = (event) => __awaiter(void 0, void 0, void 0, function* () {
    setupBlinkDb();
    if (event != null) {
        switch (event.httpMethod) {
            case "GET": {
                return handleGet(event);
            }
            case "POST": {
                return handlePost(event);
            }
            case "DELETE": {
                return handleDelete(event);
            }
            default: {
                return {
                    statusCode: 405,
                    body: JSON.stringify({ 'error': 'Invalid HTTP method ' + event.httpMethod + '.' })
                };
            }
        }
    }
    else {
        return {
            statusCode: 400,
            body: JSON.stringify({ "error": "Event is null." })
        };
    }
});
exports.lambdaHandler = lambdaHandler;
function handleGet(event) {
    return __awaiter(this, void 0, void 0, function* () {
        if (event.path.includes("/api/cat/single/")) {
            return yield getCatById(event);
        }
        else if (event.path.includes("/api/cat/list/")) {
            return getCatList();
        }
        else {
            return {
                statusCode: 400,
                body: JSON.stringify({ "error": "Invalid request." })
            };
        }
    });
}
function handlePost(event) {
    return __awaiter(this, void 0, void 0, function* () {
        if (event.body != null) {
            let cat;
            try {
                cat = JSON.parse(event.body);
            }
            catch (e) {
                if (typeof e === "string") {
                    return {
                        statusCode: 400,
                        body: JSON.stringify({ "error": e })
                    };
                }
                else if (e instanceof Error) {
                    return {
                        statusCode: 400,
                        body: JSON.stringify({ "error": e.message })
                    };
                }
                else {
                    return {
                        statusCode: 400,
                        body: JSON.stringify({ "error": "An error occurred while parsing JSON body." })
                    };
                }
            }
            const validateResponse = validateCatPost(cat);
            if (validateResponse !== null) {
                return validateResponse;
            }
            return yield insertCat(cat);
        }
        else {
            return {
                statusCode: 400,
                body: JSON.stringify({ 'error': 'No body found.' })
            };
        }
    });
}
function validateCatPost(cat) {
    if (!cat.name) {
        return {
            statusCode: 400,
            body: JSON.stringify({ 'error': 'Missing name in cat.' })
        };
    }
    if (!cat.birth_date) {
        return {
            statusCode: 400,
            body: JSON.stringify({ 'error': 'Missing birth_date in cat.' })
        };
    }
    const reStr = /^\d{4}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])$/;
    if (!reStr.test(cat.birth_date)) {
        return {
            statusCode: 400,
            body: JSON.stringify({ "error": "Invalid birth date. Must be in yyyy-mm-dd format." })
        };
    }
    return null;
}
function insertCat(catDto) {
    return __awaiter(this, void 0, void 0, function* () {
        var exception = null;
        const cat = {
            id: nextPK,
            name: catDto.name,
            color: catDto.color,
            birth_date: new Date(catDto.birth_date),
            favourite_food: catDto.favourite_food,
            owner: catDto.owner
        };
        yield (0, blinkdb_1.insert)(catTable, cat).catch(ex => exception = {
            statusCode: 400,
            body: JSON.stringify({ "error": ex })
        });
        if (exception !== null) {
            return exception;
        }
        else {
            nextPK++;
        }
        return {
            statusCode: 201,
            body: JSON.stringify({ "msg": "Cat record inserted." })
        };
    });
}
function handleDelete(event) {
    return __awaiter(this, void 0, void 0, function* () {
        if (event.pathParameters != null) {
            const { id } = event.pathParameters;
            if (id != null) {
                if (isNaN(+id)) {
                    return {
                        statusCode: 400,
                        body: JSON.stringify({ "error": "Id must be numeric." })
                    };
                }
                return yield deleteCat(parseInt(id));
            }
            else {
                return {
                    statusCode: 400,
                    body: JSON.stringify({ "error": "Id is null." })
                };
            }
        }
        else {
            // this will never happen in practice, as ApiGateway will filter requests with missing Ids
            return {
                statusCode: 400,
                body: JSON.stringify({ "error": "Missing id parameter in request." })
            };
        }
    });
}
function deleteCat(id) {
    return __awaiter(this, void 0, void 0, function* () {
        var exception = null;
        yield (0, blinkdb_1.remove)(catTable, { id: id }).catch(ex => exception = {
            statusCode: 400,
            body: JSON.stringify({ "error": ex })
        });
        if (exception !== null) {
            return exception;
        }
        return {
            statusCode: 200,
            body: JSON.stringify({ "message": "Deleted cat " + id })
        };
    });
}
function getCatById(event) {
    return __awaiter(this, void 0, void 0, function* () {
        if (event.pathParameters != null) {
            const { id } = event.pathParameters;
            if (id != null) {
                if (id == "") {
                    return {
                        statusCode: 400,
                        body: JSON.stringify({ "error": "Id is missing." })
                    };
                }
                if (isNaN(+id)) {
                    return {
                        statusCode: 400,
                        body: JSON.stringify({ "error": "Id must be numeric." })
                    };
                }
                let cat = null;
                var exception = null;
                yield (0, blinkdb_1.one)(catTable, { where: { id: parseInt(id) } })
                    .then(it => cat = it)
                    .catch(ex => exception = {
                    statusCode: 400,
                    body: JSON.stringify({ "error": ex.toString() })
                });
                if (exception !== null) {
                    return exception;
                }
                if (cat != null) {
                    return {
                        statusCode: 200,
                        body: JSON.stringify({ "cat": cat })
                    };
                }
                else {
                    return {
                        statusCode: 404,
                        body: JSON.stringify({ "error": "Cat " + id + " not found." })
                    };
                }
            }
            else {
                return {
                    statusCode: 400,
                    body: JSON.stringify({ "error": "Id is null." })
                };
            }
        }
        else {
            // this will never happen in practice, as ApiGateway will filter requests with missing Ids
            return {
                statusCode: 400,
                body: JSON.stringify({ "error": "Missing id parameter in request." })
            };
        }
    });
}
function getCatList() {
    return __awaiter(this, void 0, void 0, function* () {
        var catList = [];
        var exception = null;
        yield (0, blinkdb_1.many)(catTable).catch(ex => { return ex; })
            .then(it => catList = it)
            .catch(ex => exception = {
            statusCode: 400,
            body: JSON.stringify({ "error": ex.toString() })
        });
        if (exception !== null) {
            return exception;
        }
        const resultList = [];
        if (catList.length != 0) {
            catList.forEach(it => {
                resultList.push({ id: it.id, name: it.name });
            });
        }
        return {
            statusCode: 200,
            body: JSON.stringify({ "cat_list": resultList })
        };
    });
}
function setupBlinkDb() {
    if (!blinkdb) {
        blinkdb = (0, blinkdb_1.createDB)();
        catTable = (0, blinkdb_1.createTable)(blinkdb, "cats")();
        (0, blinkdb_1.insertMany)(catTable, [
            { id: 1, name: "Wulfgar", color: "Grey", birth_date: new Date("2020-07-01"), favourite_food: "Tuna", owner: "Kira" },
            { id: 2, name: "Teddy", color: "Spotted", birth_date: new Date("2014-03-04"), favourite_food: "Kibble", owner: "Maddie" }
        ]);
        nextPK = 3;
    }
}
