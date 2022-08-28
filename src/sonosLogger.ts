import { Logger } from 'homebridge';

export class SonosLogger {
    private log: Logger;
    private logHeader: string;

    constructor(name: string, log: Logger) {
        this.log = log;
        this.logHeader = `${name} - `;
    }

    logInfo(message: string) {
        this.log.info(`${this.logHeader}${message}`);
    }

    logDebug(message: string) {
        this.log.debug(`${this.logHeader}${message}`);
    }

    logError(message: string) {
        this.log.error(`${this.logHeader}${message}`);
    }
}
