module.exports = {
    successfulDeployment: [{
        "Records": [
            {
                "EventSource": "aws:sns",
                "EventVersion": "1.0",
                "EventSubscriptionArn": "arn:aws:sns:eu-west-2:677183322136:temporary-status-deployment-events:d9b4f661-8461-4c7e-b6f7-728fcab87996",
                "Sns": {
                    "Type": "Notification",
                    "MessageId": "8e47610a-4eb4-5514-a42d-3ac878a21958",
                    "TopicArn": "arn:aws:sns:eu-west-2:677183322136:temporary-status-deployment-events",
                    "Subject": "CREATED: AWS CodeDeploy d-MainDeployment in eu-west-2 to temporary-status",
                    "Message": "{\"region\":\"eu-west-2\",\"accountId\":\"677183322136\",\"eventTriggerName\":\"send-deploy-events\",\"applicationName\":\"temporary-status\",\"deploymentId\":\"d-MainDeployment\",\"deploymentGroupName\":\"temporary-status-deployment\",\"createTime\":\"Thu Oct 13 15:50:45 UTC 2022\",\"completeTime\":null,\"status\":\"CREATED\"}",
                    "Timestamp": "2022-10-13T15:50:46.039Z",
                }
            }
        ]
    }, {
        "Records": [
            {
                "EventSource": "aws:sns",
                "EventVersion": "1.0",
                "EventSubscriptionArn": "arn:aws:sns:eu-west-2:677183322136:temporary-status-deployment-events:d9b4f661-8461-4c7e-b6f7-728fcab87996",
                "Sns": {
                    "Type": "Notification",
                    "MessageId": "c9527cbc-683e-5463-bae7-277e5017ff1d",
                    "TopicArn": "arn:aws:sns:eu-west-2:677183322136:temporary-status-deployment-events",
                    "Subject": "SUCCEEDED: AWS CodeDeploy d-MainDeployment in eu-west-2 to temporary-status",
                    "Message": "{\"region\":\"eu-west-2\",\"accountId\":\"677183322136\",\"eventTriggerName\":\"send-deploy-events\",\"applicationName\":\"temporary-status\",\"deploymentId\":\"d-MainDeployment\",\"deploymentGroupName\":\"temporary-status-deployment\",\"createTime\":\"Thu Oct 13 15:50:45 UTC 2022\",\"completeTime\":\"Thu Oct 13 15:59:37 UTC 2022\",\"deploymentOverview\":\"{\\\"Succeeded\\\":1,\\\"Failed\\\":0,\\\"Skipped\\\":0,\\\"InProgress\\\":0,\\\"Pending\\\":0}\",\"status\":\"SUCCEEDED\"}",
                    "Timestamp": "2022-10-13T15:59:37.312Z",
                }
            }
        ]
    }],
    failedDeployment: [{
        "Records": [
            {
                "EventSource": "aws:sns",
                "EventVersion": "1.0",
                "EventSubscriptionArn": "arn:aws:sns:eu-west-2:677183322136:temporary-status-deployment-events:d9b4f661-8461-4c7e-b6f7-728fcab87996",
                "Sns": {
                    "Type": "Notification",
                    "MessageId": "2278be68-80d9-5985-b745-e5aba28e320a",
                    "TopicArn": "arn:aws:sns:eu-west-2:677183322136:temporary-status-deployment-events",
                    "Subject": "CREATED: AWS CodeDeploy d-MainDeployment in eu-west-2 to temporary-status",
                    "Message": "{\"region\":\"eu-west-2\",\"accountId\":\"677183322136\",\"eventTriggerName\":\"send-deploy-events\",\"applicationName\":\"temporary-status\",\"deploymentId\":\"d-MainDeployment\",\"deploymentGroupName\":\"temporary-status-deployment\",\"createTime\":\"Fri Oct 14 08:38:46 UTC 2022\",\"completeTime\":null,\"status\":\"CREATED\"}",
                    "Timestamp": "2022-10-14T08:38:47.390Z",
                }
            }
        ]
    }, {
        "Records": [
            {
                "EventSource": "aws:sns",
                "EventVersion": "1.0",
                "EventSubscriptionArn": "arn:aws:sns:eu-west-2:677183322136:temporary-status-deployment-events:d9b4f661-8461-4c7e-b6f7-728fcab87996",
                "Sns": {
                    "Type": "Notification",
                    "MessageId": "d29fdec1-9819-5ac0-b9c2-8502bc0284e5",
                    "TopicArn": "arn:aws:sns:eu-west-2:677183322136:temporary-status-deployment-events",
                    "Subject": "FAILED: AWS CodeDeploy d-MainDeployment in eu-west-2 to temporary-status",
                    "Message": "{\"region\":\"eu-west-2\",\"accountId\":\"677183322136\",\"eventTriggerName\":\"send-deploy-events\",\"applicationName\":\"temporary-status\",\"deploymentId\":\"d-MainDeployment\",\"deploymentGroupName\":\"temporary-status-deployment\",\"createTime\":\"Fri Oct 14 08:38:46 UTC 2022\",\"completeTime\":\"Fri Oct 14 08:46:18 UTC 2022\",\"deploymentOverview\":\"{\\\"Succeeded\\\":1,\\\"Failed\\\":0,\\\"Skipped\\\":0,\\\"InProgress\\\":0,\\\"Pending\\\":0}\",\"status\":\"FAILED\",\"errorInformation\":\"{\\\"ErrorCode\\\":\\\"ECS_UPDATE_ERROR\\\",\\\"ErrorMessage\\\":\\\"CodeDeploy detected that the replacement task set is unhealthy.\\\"}\",\"rollbackInformation\":\"{}\"}",
                    "Timestamp": "2022-10-14T08:46:19.105Z",
                }
            }
        ]
    }, {
        "Records": [
            {
                "EventSource": "aws:sns",
                "EventVersion": "1.0",
                "EventSubscriptionArn": "arn:aws:sns:eu-west-2:677183322136:temporary-status-deployment-events:d9b4f661-8461-4c7e-b6f7-728fcab87996",
                "Sns": {
                    "Type": "Notification",
                    "MessageId": "e6474cdd-2d2b-587e-9c78-171e09309f15",
                    "TopicArn": "arn:aws:sns:eu-west-2:677183322136:temporary-status-deployment-events",
                    "Subject": "CREATED: AWS CodeDeploy d-RollbackDeploy in eu-west-2 to temporary-status",
                    "Message": "{\"region\":\"eu-west-2\",\"accountId\":\"677183322136\",\"eventTriggerName\":\"send-deploy-events\",\"applicationName\":\"temporary-status\",\"deploymentId\":\"d-RollbackDeploy\",\"deploymentGroupName\":\"temporary-status-deployment\",\"createTime\":\"Fri Oct 14 08:46:19 UTC 2022\",\"completeTime\":null,\"status\":\"CREATED\",\"rollbackInformation\":\"{\\\"RollbackMessage\\\":\\\"Deployment d-RollbackDeploy is triggered to roll back deployment d-MainDeployment.\\\",\\\"RollbackTriggeringDeploymentId\\\":\\\"d-MainDeployment\\\"}\"}",
                    "Timestamp": "2022-10-14T08:46:19.571Z",
                }
            }
        ]
    }, {
        "Records": [
            {
                "EventSource": "aws:sns",
                "EventVersion": "1.0",
                "EventSubscriptionArn": "arn:aws:sns:eu-west-2:677183322136:temporary-status-deployment-events:d9b4f661-8461-4c7e-b6f7-728fcab87996",
                "Sns": {
                    "Type": "Notification",
                    "MessageId": "1e1b0a5f-9a6b-5124-a74b-519cbe771f01",
                    "TopicArn": "arn:aws:sns:eu-west-2:677183322136:temporary-status-deployment-events",
                    "Subject": "IN_PROGRESS: AWS CodeDeploy d-RollbackDeploy in eu-west-2 to temporary-status",
                    "Message": "{\"region\":\"eu-west-2\",\"accountId\":\"677183322136\",\"eventTriggerName\":\"send-deploy-events\",\"applicationName\":\"temporary-status\",\"deploymentId\":\"d-RollbackDeploy\",\"deploymentGroupName\":\"temporary-status-deployment\",\"createTime\":\"Fri Oct 14 08:46:19 UTC 2022\",\"completeTime\":null,\"status\":\"IN_PROGRESS\",\"rollbackInformation\":\"{\\\"RollbackMessage\\\":\\\"Deployment d-RollbackDeploy is triggered to roll back deployment d-MainDeployment.\\\",\\\"RollbackTriggeringDeploymentId\\\":\\\"d-MainDeployment\\\"}\"}",
                    "Timestamp": "2022-10-14T08:46:20.121Z",
                }
            }
        ]
    }, {
        "Records": [
            {
                "EventSource": "aws:sns",
                "EventVersion": "1.0",
                "EventSubscriptionArn": "arn:aws:sns:eu-west-2:677183322136:temporary-status-deployment-events:d9b4f661-8461-4c7e-b6f7-728fcab87996",
                "Sns": {
                    "Type": "Notification",
                    "MessageId": "27ba1db2-bf92-50ee-a4d8-46719b8c9785",
                    "TopicArn": "arn:aws:sns:eu-west-2:677183322136:temporary-status-deployment-events",
                    "Subject": "SUCCEEDED: AWS CodeDeploy d-RollbackDeploy in eu-west-2 to temporary-status",
                    "Message": "{\"region\":\"eu-west-2\",\"accountId\":\"677183322136\",\"eventTriggerName\":\"send-deploy-events\",\"applicationName\":\"temporary-status\",\"deploymentId\":\"d-RollbackDeploy\",\"deploymentGroupName\":\"temporary-status-deployment\",\"createTime\":\"Fri Oct 14 08:46:19 UTC 2022\",\"completeTime\":\"Fri Oct 14 08:46:22 UTC 2022\",\"deploymentOverview\":\"{\\\"Succeeded\\\":1,\\\"Failed\\\":0,\\\"Skipped\\\":0,\\\"InProgress\\\":0,\\\"Pending\\\":0}\",\"status\":\"SUCCEEDED\",\"rollbackInformation\":\"{\\\"RollbackMessage\\\":\\\"Deployment d-RollbackDeploy is triggered to roll back deployment d-MainDeployment.\\\",\\\"RollbackTriggeringDeploymentId\\\":\\\"d-MainDeployment\\\"}\"}",
                    "Timestamp": "2022-10-14T08:46:22.763Z",
                }
            }
        ]
    }]
};
