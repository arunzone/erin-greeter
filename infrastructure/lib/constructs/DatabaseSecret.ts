
import { Construct } from 'constructs';
import * as sm from 'aws-cdk-lib/aws-secretsmanager';
export interface SecretConstructProps {
  username: string;
  password?: string;
}

export class SecretConstruct extends Construct {
    public readonly instance: sm.Secret;
    constructor(scope: Construct, id: string, props: SecretConstructProps) {
        super(scope, id);
    
        this.instance = new sm.Secret(this, 'DBCredentials', {
            generateSecretString: {
                secretStringTemplate: JSON.stringify({
                username: props.username,
                }),
                excludePunctuation: true,
                excludeCharacters: '/@"\' ',
                generateStringKey: 'password',
            },
        })
    }
}