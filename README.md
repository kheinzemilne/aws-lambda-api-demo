# api-demo

## Requirements
- Node.js 18
- TypeScript
- AWS CLI
- AWS SAM CLI
- Docker

## Build and Deploy
- Run `tsc` to compile the typescript into js
- Run `sam build` to build the docker image for deployment to AWS Lambda
- Run `sam deploy --guided` to deploy image to AWS Lambda

## Testing
- Run `tsc` to ensure latest js is compiled
- In the `api-demo` folder, run `npm run test`
