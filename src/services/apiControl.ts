import { SonosDeviceManager } from '../helpers/sonosDeviceManager';
import { Request, Response, Router } from 'express';
import { SonosLogger } from '../helpers/sonosLogger';
import { DEFAULT_VOLUME_CHANGE } from '../models/constants';
import { DeviceDetails, ExpressModel } from '../models/models';

export class ApiControlService {
    private expressModel: ExpressModel;
    private modelName: string;
    private roomName: string;
    private device: SonosDeviceManager;
    private logger: SonosLogger;
    private defaultChange: number = DEFAULT_VOLUME_CHANGE;
    private port: number;

    private deviceUri: string;
    private upUri: string;
    private downUri: string;
    private toggleMuteUri: string;
    private toggleSpeechEnhancementUri: string;
    private toggleNightModeUri: string;
    private getVolumeLevelUri: string;

    constructor(expressModel: ExpressModel, deviceDetails: DeviceDetails, sonosDevice: SonosDeviceManager, logger: SonosLogger) {
        this.expressModel = expressModel;

        //Make the string URL compliant as per https://stackoverflow.com/a/8485137
        this.roomName = deviceDetails.RoomName.replace(/[^a-z0-9]/gi, '-').toLowerCase();
        this.modelName = deviceDetails.DisplayName.replace(/[^a-z0-9]/gi, '-').toLowerCase();
        this.port = deviceDetails.ExpressAppPort;
        this.device = sonosDevice;
        this.logger = logger;

        this.deviceUri = this.roomName === this.modelName ? `/${this.roomName}` : `/${this.roomName}/${this.modelName}`;
        this.upUri = `/volume-up`;
        this.downUri = `/volume-down`;
        this.toggleMuteUri = `/toggle-mute`;
        this.toggleSpeechEnhancementUri = `/toggle-speech-enhancement`;
        this.toggleNightModeUri = `/toggle-night-mode`;
        this.getVolumeLevelUri = `/volume`;

        this.setupEndpoints();
        this.logEndpointUris();
    }

    setupEndpoints() {
        const router = Router();

        // Listening to all http verbs to make it easier incase a user sets things up wrong.
        router.all(this.upUri, async (req: Request, res: Response) => {
            try {
                const increment = this.parseQueryParam(req.query.value as string);
                await this.device.volumeUp(increment);
                res.status(200).send(`Turning volume up by ${increment}`);
            } catch (error: any) {
                res.status(500).send(error.message);
            }
        });

        router.all(this.downUri, async (req: Request, res: Response) => {
            try {
                const decrement = this.parseQueryParam(req.query.value as string);
                await this.device.volumeDown(decrement);
                res.status(200).send(`Turning volume down by ${decrement}`);
            } catch (error: any) {
                res.status(500).send(error.message);
            }
        });

        router.all(this.toggleMuteUri, async (req: Request, res: Response) => {
            try {
                var currentStatus = await this.device.getMuted();
                var message = currentStatus ? 'Turning Mute off' : 'Turning Mute on';
                await this.device.setMuted(!currentStatus);
                res.status(200).send(message);
            } catch (error: any) {
                res.status(500).send(error.message);
            }
        });

        router.all(this.toggleNightModeUri, async (req: Request, res: Response) => {
            try {
                var currentStatus = await this.device.getNightMode();
                var message = currentStatus ? 'Turning Night mode off' : 'Turning Night Mode on';
                await this.device.setNightMode(!currentStatus);
                res.status(200).send(message);
            } catch (error: any) {
                res.status(500).send(error.message);
            }
        });

        router.all(this.toggleSpeechEnhancementUri, async (req: Request, res: Response) => {
            try {
                var currentStatus = await this.device.getSpeechEnhancement();
                var message = currentStatus ? 'Turning Speech Enhancement off' : 'Turning Speech Enhancement on';
                await this.device.setSpeechEnhancement(!currentStatus);
                res.status(200).send(message);
            } catch (error: any) {
                res.status(500).send(error.message);
            }
        });

        router.all(this.getVolumeLevelUri, async (req: Request, res: Response) => {
            try {
                var volume = await this.device.getVolume();
                res.status(200).send({ volume: volume });
            } catch (error: any) {
                res.status(500).send(error.message);
            }
        });

        this.expressModel.app.use(`${this.deviceUri}`, router);

        try {
            this.logger.logInfo(this.expressModel.app._router.stack);
        } catch {}
    }

    private logEndpointUris() {
        // Need this to tell the user where to point their buttons/shortcuts
        this.logger.logInfo(`Volume Up endpoint listening on - {{YOUR_HOMEBRIDGE_ADDRESS}}:${this.port}${this.deviceUri}${this.upUri}`);
        this.logger.logInfo(`Volume Down endpoint listening on - {{YOUR_HOMEBRIDGE_ADDRESS}}:${this.port}${this.deviceUri}${this.downUri}`);
        this.logger.logInfo(`Toggle Mute endpoint listening on - {{YOUR_HOMEBRIDGE_ADDRESS}}:${this.port}${this.deviceUri}${this.toggleMuteUri}`);
        this.logger.logInfo(
            `Toggle Night Mode endpoint listening on - {{YOUR_HOMEBRIDGE_ADDRESS}}:${this.port}${this.deviceUri}${this.toggleNightModeUri}`
        );
        this.logger.logInfo(
            `Toggle Speech Enhancement endpoint listening on - {{YOUR_HOMEBRIDGE_ADDRESS}}:${this.port}${this.deviceUri}${this.toggleSpeechEnhancementUri}`
        );
        this.logger.logInfo(`Get Volume level - {{YOUR_HOMEBRIDGE_ADDRESS}}:${this.port}${this.deviceUri}${this.getVolumeLevelUri}`);
    }

    private parseQueryParam(param: string | undefined): number {
        if (param === undefined) return this.defaultChange;

        var toReturn = Number(param);

        if (Number.isNaN(toReturn)) throw Error('Please only pass numbers to the endpoint');

        if (toReturn < 1 || toReturn > 100) throw Error('Please only provide values between 1 & 100');

        return toReturn;
    }
}
