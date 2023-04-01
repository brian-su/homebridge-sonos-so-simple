import { Logger } from 'homebridge';

export class SonosLogger {
    private log: Logger;
    private logHeader: string;

    constructor(deviceName: string, roomName: string, log: Logger) {
        this.log = log;
        this.logHeader = `${roomName} ${deviceName} - `;
    }

    public logInfo(message: string): void {
        this.log.info(`${this.logHeader}${message}`);
    }

    public logDebug(message: string): void {
        this.log.debug(`${this.logHeader}${message}`);
    }

    public logError(message: string): void {
        this.log.error(`${this.logHeader}${message}`);
    }
}
