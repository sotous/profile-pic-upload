# System Design Exercise

This repository is an exercise focus on solving a basic and modern problem, which aims to upload a user profile picture and persist it.

The idea of this repository is to keep track of our thinking, mistakes and corrections, which will help us make better future decisions in system design, and add some practice to our existing abilities.

There are many roads and options to solve this problem. We came up with our own solution first, which was going to be evaluated by AI.

Following, I proceed to describe the solution we came with:

- A user would upload his picture from the client directly to the web server.
- The use of a file input tag in our client will generate a multipart-form.
- The multipart-form will be sent to the server.
- The server will receive the file and temporarily store it in the server per se.
- Once stored, the server would call this Lambda Function to upload the file directly to S3.
- The Lambda function would work as a proxy S3 server.
- The Lambda function would need to also decode and buffer the file, to have it ready for the S3.
- Once the file is successfully submitted to the S3 by the lambda function, we keep the ObjectURL.
- The response of the lambda function if the request goes successful, will be the ObjectURL.
- Consequently, the server will receive this payload as a response, storing the ObjectURL in the database as the profile pic for this user.

### AI Evaluation

#### What's good about this design:
- Centralized Logic: Your Node.js server acts as a single gateway. This can be useful if you need to perform complex validation, authorization, or other business logic before even attempting to upload to AWS.
- Familiar Pattern: It feels like a traditional monolithic or microservice architecture, which can be comfortable to work with.

#### The potential problems with this design:
- Double Bandwidth Cost: The user uploads the file to your server, and then your server uploads the same file to Lambda/S3. If a user uploads a 5MB profile picture, your server has to handle 5MB of inbound traffic and 5MB of outbound traffic. This can be costly and slow.
- Scalability Bottleneck: Your Node.js server is a stateful bottleneck. It has to handle the full file upload stream for every user. If 100 users upload a 5MB file at the same time, your server needs to process 500MB of data simultaneously. This requires significant memory and processing power and can easily overload the server.
- Increased Latency: The file has to make two full trips over the network (Client -> Server, then Server -> Lambda). This adds significant delay for the end-user.
- Unnecessary Complexity: Storing the file temporarily on your server's disk adds complexity and requires cleanup logic to avoid filling up the disk. It also makes the server stateful, which is harder to scale horizontally.

### New Solution Based on the AI Evaluation

graph TD
    A[React Client] -- "1. Request Upload URL<br/>(with filename, filetype)" --> C[AWS Lambda];
    C -- "2. Generate Presigned URL" --> D{S3 Bucket};
    C -- "3. Return Presigned URL" --> A;
    A -- "4. Upload File Directly<br/>(using the special URL)" --> D;
    D -- "5. Trigger Notification<br/>(on object creation)" --> F[Another AWS Lambda];
    F -- "6. Store File URL/Key" --> E[Database];

    subgraph "AWS"
      C;
      D;
      F;
      E[Database];
    end

- Request an Upload Link to the Lambda Function directly from the client-side.
- The Lambda Function will receive this request and trigger the S3 bucket with a Request through the AWS SDK.
- The S3 has the ability to generate a presigned URL.
- The Lambda Function returns the presigned URL.
- The client-side receives the presigned URL to upload the picture but it also receives the ObjectURL.
- The client-side uses the presigned URL to upload the profile picture.
- If the above request is successful, we have a few options:
  a. The S3 triggers the lambda function back to persist the ObjectURL in the ecosystem's DB.
  b. The client-side makes an HTTP Request to the web server to store the ObjectURL as the user's profile picture.
- We implemented option (b) as it better suited this exercise. In the real world we would just have implemented option (a) as it would have kept a single request on the client-side, and would have reduced latency, complexity and user band-width.


## Usage

### Deployment

In order to deploy the function, you need to run the following command:

```
serverless deploy
```

After running deploy, you should see output similar to:

```
Deploying "serverless-http-api" to stage "dev" (us-east-1)

✔ Service deployed to stack serverless-http-api-dev (91s)

endpoint: GET - https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/
functions:
  hello: serverless-http-api-dev-hello (1.6 kB)
```

_Note_: In current form, after deployment, your API is public and can be invoked by anyone. For production deployments, you might want to configure an authorizer. For details on how to do that, refer to [HTTP API (API Gateway V2) event docs](https://www.serverless.com/framework/docs/providers/aws/events/http-api).

### Invocation

After successful deployment, you can call the created application via HTTP:

```
curl https://xxxxxxx.execute-api.us-east-1.amazonaws.com/
```

Which should result in response similar to:

```json
{ "message": "Go Serverless v4! Your function executed successfully!" }
```

### Local development

The easiest way to develop and test your function is to use the `dev` command:

```
serverless dev
```

This will start a local emulator of AWS Lambda and tunnel your requests to and from AWS Lambda, allowing you to interact with your function as if it were running in the cloud.

Now you can invoke the function as before, but this time the function will be executed locally. Now you can develop your function locally, invoke it, and see the results immediately without having to re-deploy.

When you are done developing, don't forget to run `serverless deploy` to deploy the function to the cloud.
