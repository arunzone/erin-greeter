import { LambdaClient, GetFunctionCommand } from '@aws-sdk/client-lambda';
import { LAMBDA_CONFIG } from './testConfig';

export const getLambdaFunctionConfig = async (lambdaClient: LambdaClient) => {
  return await lambdaClient.send(
    new GetFunctionCommand({
      FunctionName: LAMBDA_CONFIG.functionName,
    })
  );
};

export { LAMBDA_CONFIG };
