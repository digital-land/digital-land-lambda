const aws = require('aws-sdk');
const zlib = require('zlib');
const util = require('util');

const gunzip = util.promisify(zlib.gunzip);

const getLogEvents = async (s3, Bucket, Key) => {
    try {
        const s3Object = await s3.getObject({Bucket, Key}).promise();
        const log = await gunzip(s3Object.Body);

        const fields = log.toString()
            .split('\n')
            .find(line => line.startsWith('#Fields:'))
            .replace('#Fields: ', '')
            .split(' ');

        return log.toString()
            .split('\n')
            .filter(line => !line.startsWith('#'))
            .filter(line => !!line)
            .map((line) => Object.fromEntries(line.split('\t').map((column, index) => ([fields[index], column]))))
            .map(line => {
                const date = line.date.split('-').map(d => parseInt(d));
                const time = line.time.split(':').map(d => parseInt(d));
                const timestamp = new Date(date[0], date[1] - 1, date[2], time[0], time[1], time[2]).getTime();
                return {timestamp, message: JSON.stringify(line)};
            });
    } catch (err) {
        console.error(err);
        return [];
    }
};

const getLogStream = async (cloudWatchLogs, logGroupName, logStreamName) => {
    await cloudWatchLogs.createLogStream({logGroupName, logStreamName}).promise();
    const streams = await cloudWatchLogs.describeLogStreams({logGroupName, logStreamNamePrefix: logStreamName}).promise();

    return {
        logStreamName: streams.logStreams[0].logStreamName,
        sequenceToken: streams.logStreams[0].uploadSequenceToken,
    };
};

const putLogs = async (cloudWatchLogs, logGroupName, logStreamNamePrefix, logs) => {
    let {logStreamName, sequenceToken} = await getLogStream(cloudWatchLogs, logGroupName, logStreamNamePrefix);

    logs.sort((a, b) => b.timestamp - a.timestamp);

    while (logs.length > 0) {
        // shift up to 300 lines from the log
        const logEvents = [];
        while (logs.length !== 0 && logEvents.length < 300) {
            logEvents.unshift(logs.shift());
        }

        const {nextSequenceToken} = await cloudWatchLogs.putLogEvents({
            logEvents,
            logGroupName,
            logStreamName,
            sequenceToken,
        }).promise();

        sequenceToken = nextSequenceToken;
    }
};

module.exports = {
    handler: async (event, context) => {
        const s3 = new aws.S3({apiVersion: '2006-03-01'});
        const cloudWatchLogs = new aws.CloudWatchLogs({apiVersion: '2014-03-28'});
        const logGroupName = process.env.TARGET_LOG_GROUP;

        const logs = await Promise.all(event.Records.map(async (record) => {
            const Bucket = record.s3.bucket.name;
            const Key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));
            return await getLogEvents(s3, Bucket, Key);
        }));

        await putLogs(cloudWatchLogs, logGroupName, context.awsRequestId, logs.flat());
    }
}
