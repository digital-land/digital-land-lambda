const aws = require('aws-sdk');
const zlib = require('zlib');
const util = require('util');

const gunzip = util.promisify(zlib.gunzip);

const toLogEvent = (line) => {
    let timestamp = null;

    if (line.timestamp !== undefined && line.timestamp !== null) {
        const numericTimestamp = Number(line.timestamp);
        if (Number.isFinite(numericTimestamp)) {
            timestamp = numericTimestamp;
        } else {
            const parsedTimestamp = Date.parse(line.timestamp);
            if (!Number.isNaN(parsedTimestamp)) {
                timestamp = parsedTimestamp;
            }
        }
    }

    if ((timestamp === null || !Number.isFinite(timestamp)) && line.date && line.time) {
        const parsedTimestamp = Date.parse(`${line.date}T${line.time}Z`);
        if (!Number.isNaN(parsedTimestamp)) {
            timestamp = parsedTimestamp;
        }
    }

    if (timestamp === null || !Number.isFinite(timestamp)) {
        timestamp = Date.now();
    }

    return {timestamp, message: JSON.stringify(line)};
};

const parseLegacyCloudFrontLogs = (content, fieldsLine) => {
    const fields = fieldsLine
        .replace('#Fields: ', '')
        .split(' ');

    return content
        .split('\n')
        .filter(line => !line.startsWith('#'))
        .filter(line => !!line)
        .map((line) => Object.fromEntries(line.split('\t').map((column, index) => ([fields[index], column]))))
        .map(toLogEvent);
};

const parseJsonCloudFrontLogs = (content) => {
    return content
        .split('\n')
        .map(line => line.trim())
        .filter(line => !!line)
        .filter(line => !line.startsWith('#'))
        .map((line) => {
            try {
                return JSON.parse(line);
            } catch (err) {
                console.error('Failed to parse JSON CloudFront log line', err);
                return null;
            }
        })
        .filter(line => line !== null)
        .map(toLogEvent);
};

const getLogEvents = async (s3, Bucket, Key) => {
    try {
        const s3Object = await s3.getObject({Bucket, Key}).promise();
        const log = await gunzip(s3Object.Body);
        const content = log.toString();
        const fieldsLine = content
            .split('\n')
            .find(line => line.startsWith('#Fields:'));

        if (fieldsLine) {
            return parseLegacyCloudFrontLogs(content, fieldsLine);
        }

        return parseJsonCloudFrontLogs(content);
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
