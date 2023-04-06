'use strict';

import { lambdaHandler } from '../../app.js';
import { expect } from 'chai';
import createEvent from 'aws-event-mocks';

describe('Tests Get Cat by ID', function () {
    it('Get cat by valid ID returns 200', async () => {
        const event = createEvent({
            template: 'aws:apiGateway',
            merge: {
                pathParameters: {
                    id: 1
                },
                path: "/api/cat/single/",
                httpMethod: "GET"
            }
        });

        const result = await lambdaHandler(event)

        expect(result).to.be.an('object');
        expect(result.statusCode).to.equal(200);
        expect(result.body).to.be.an('string');

        let response = JSON.parse(result.body);

        expect(response).to.be.an('object');
    });

    it('Get cat by invalid ID returns 400 must be numeric', async () => {
        const event = createEvent({
            template: 'aws:apiGateway',
            merge: {
                pathParameters: {
                    id: "red"
                },
                path: "/api/cat/single/",
                httpMethod: "GET"
            }
        });

        const result = await lambdaHandler(event)

        expect(result).to.be.an('object')
        expect(result.statusCode).to.be.equal(400)
        expect(result.body).to.be.an('string')
        expect(result.body).to.be.equal(JSON.stringify({"error": "Id must be numeric."}))
    })

    it('Get cat by no ID returns 400 id is missing', async () => {
        const event = createEvent({
            template: 'aws:apiGateway',
            merge: {
                pathParameters: {
                    id: ""
                },
                path: "/api/cat/single/",
                httpMethod: "GET"
            }
        });

        const result = await lambdaHandler(event)

        expect(result).to.be.an('object')
        expect(result.statusCode).to.be.equal(400)
        expect(result.body).to.be.an('string')
        expect(result.body).to.be.equal(JSON.stringify({"error": "Id is missing."}))
    })
});

describe('Tests Post New Cat', function () {
    it('Post valid cat returns 201', async () => {
        const event = createEvent({
            template: 'aws:apiGateway',
            merge: {
                body: JSON.stringify({name: "Wulfgar", color: "Grey", birth_date: "2020-07-01", favourite_food: "Tuna", owner: "Kira"}),
                pathParameters: {
                    id: ""
                },
                path: "/api/cat/new/",
                httpMethod: "POST"
            }
        });

        const result = await lambdaHandler(event)

        expect(result).to.be.an('object')
        expect(result.statusCode).to.be.equal(201)
        expect(result.body).to.be.an('string')
        expect(result.body).to.be.equal(JSON.stringify({"msg": "Cat record inserted."}))
    })

    it('Post cat with strange data and extra fields returns 201', async () => {
        const event = createEvent({
            template: 'aws:apiGateway',
            merge: {
                body: JSON.stringify({name: true, color: 22, birth_date: "2020-07-01", chickens: false, turnips: true, price: "$4.99"}),
                pathParameters: {
                    id: ""
                },
                path: "/api/cat/new/",
                httpMethod: "POST"
            }
        });

        const result = await lambdaHandler(event)

        // despite everything, this is still a valid cat. JSON parsing turns the bool and int values
        // into strings per the CatDto interface, the birth_date is still valid, and it ignores
        // the extra fields not included in the CatDto interface.
        expect(result).to.be.an('object')
        expect(result.statusCode).to.be.equal(201)
        expect(result.body).to.be.an('string')
        expect(result.body).to.be.equal(JSON.stringify({"msg": "Cat record inserted."}))
    })

    it('Posted cat missing name returns 400', async () => {
        const event = createEvent({
            template: 'aws:apiGateway',
            merge: {
                body: JSON.stringify({color: "Grey", birth_date: "2020-07-01", favourite_food: "Tuna", owner: "Kira"}),
                pathParameters: {
                    id: ""
                },
                path: "/api/cat/new/",
                httpMethod: "POST"
            }
        });

        const result = await lambdaHandler(event)

        expect(result).to.be.an('object')
        expect(result.statusCode).to.be.equal(400)
        expect(result.body).to.be.an('string')
        expect(result.body).to.be.equal(JSON.stringify({"error": "Missing name in cat."}))
    })

    it('Posted cat missing birth_date returns 400', async () => {
        const event = createEvent({
            template: 'aws:apiGateway',
            merge: {
                body: JSON.stringify({name: "Wulfgar", color: "Grey", favourite_food: "Tuna", owner: "Kira"}),
                pathParameters: {
                    id: ""
                },
                path: "/api/cat/new/",
                httpMethod: "POST"
            }
        });

        const result = await lambdaHandler(event)

        expect(result).to.be.an('object')
        expect(result.statusCode).to.be.equal(400)
        expect(result.body).to.be.an('string')
        expect(result.body).to.be.equal(JSON.stringify({"error": "Missing birth_date in cat."}))
    })

    it('Posted cat with invalid birth_date returns 400', async () => {
        const event = createEvent({
            template: 'aws:apiGateway',
            merge: {
                body: JSON.stringify({name: "Wulfgar", color: "Grey", birth_date: "2020/07/01", favourite_food: "Tuna", owner: "Kira"}),
                pathParameters: {
                    id: ""
                },
                path: "/api/cat/new/",
                httpMethod: "POST"
            }
        });

        const result = await lambdaHandler(event)

        expect(result).to.be.an('object')
        expect(result.statusCode).to.be.equal(400)
        expect(result.body).to.be.an('string')
        expect(result.body).to.be.equal(JSON.stringify({"error": "Invalid birth date. Must be in yyyy-mm-dd format."}))
    })
});

describe('Tests Delete Cat by ID', function () {
    it('Existing cat is deleted returns 200 deleted cat', async () => {
        const event = createEvent({
            template: 'aws:apiGateway',
            merge: {
                pathParameters: {
                    id: 1
                },
                path: "/api/cat/delete/",
                httpMethod: "DELETE"
            }
        });

        const result = await lambdaHandler(event)

        expect(result).to.be.an('object');
        expect(result.statusCode).to.equal(200);
        expect(result.body).to.be.an('string');
        expect(result.body).to.be.equal(JSON.stringify({"message": "Deleted cat 1"}))
    })

    it('Cat does not exist returns 200 deleted cat', async () => {
        // I have this returning the same thing as an existing cat being deleted, as the end result is still the same
        // The cat with the given ID is not in the database.
        const event = createEvent({
            template: 'aws:apiGateway',
            merge: {
                pathParameters: {
                    id: 3
                },
                path: "/api/cat/delete/",
                httpMethod: "DELETE"
            }
        });

        const result = await lambdaHandler(event)

        expect(result).to.be.an('object');
        expect(result.statusCode).to.equal(200);
        expect(result.body).to.be.an('string');
        expect(result.body).to.be.equal(JSON.stringify({"message": "Deleted cat 3"}))
    })

    it('Invalid ID returns 400 must be numeric', async () => {
        const event = createEvent({
            template: 'aws:apiGateway',
            merge: {
                pathParameters: {
                    id: "red"
                },
                path: "/api/cat/delete/",
                httpMethod: "DELETE"
            }
        });

        const result = await lambdaHandler(event)

        expect(result).to.be.an('object');
        expect(result.statusCode).to.equal(400);
        expect(result.body).to.be.an('string');
        expect(result.body).to.be.equal(JSON.stringify({"error": "Id must be numeric."}))
    })
});
