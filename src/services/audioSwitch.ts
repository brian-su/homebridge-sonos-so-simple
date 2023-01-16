import { SonosDeviceManager } from '../helpers/sonosDeviceManager';
import { SonosLogger } from '../helpers/sonosLogger';
import { DeviceEvents } from '../models/enums';
import { AudioInputModel } from '../models/models';
import { AVTransportEvent } from '../models/sonos-types';
import * as fs from 'fs';

/*
    FIXME: This is broken asf. The URI is different per song/artist/whatever so can't be used to pick out the input type.
    You are a dumbass Brian. I think saving files to preserve the volume levels for each input is a bit janky 
    but ok enough to protect from losing all the data on homebridge reboot.
    Need a more reliable way of picking out TV vs all the other different inputs tho. URI changes per device & manufacturer

    Some URIs:

    TV URI: x-sonos-htastream:RINCON_542A1B8C538201400:spdif
    Airplay Music URI: x-sonos-vli:RINCON_542A1B8C538201400:1,airplay:2ebcfc336e2a41bab07db08143c1a375
    Sonos Radio URI: x-sonos-http:sonos%3a2a27c575703dc08f20c49121e916a57a%3a1%3a1673694798097%3ahead%3a163106%3a%3atra.297726284%3adefault%3aSD.mp4?sid=303&flags=0&sn=1
    Spotify URI: x-sonos-spotify:spotify:track:1ID1QFSNNxi0hiZCNcwjUC?sid=9&flags=0&sn=4
    Apple Music URI: x-sonosprog-http:song%3a1523067945.mp4?sid=204&flags=8232&sn=2
    BBC Sounds URI: x-sonosapi-hls:stations%7eplayable%7e%7ebbc_radio_one%7e%7eurn%3abbc%3aradio%3anetwork%3abbc_radio_one?sid=325&flags=296&sn=3
*/
export class AudioSwitchService {
    private device: SonosDeviceManager;
    private logger: SonosLogger;
    private settingsFile: string;

    private audioInputVolumes: AudioInputModel[] = [];
    private previousUri: string | undefined;

    constructor(sonosDevice: SonosDeviceManager, host: string, logger: SonosLogger) {
        this.device = sonosDevice;
        this.logger = logger;
        this.settingsFile = `${host}_audioInputVolumes.json`;

        if (fs.existsSync(this.settingsFile)) {
            fs.readFile(this.settingsFile, 'utf8', (error, data) => {
                if (error) {
                    this.logger.logError('Error reading input volume levels from file. Preserved audio levels may have been lost');
                    return;
                }

                this.audioInputVolumes = JSON.parse(data);
            });
        }

        this.device.on(DeviceEvents.AudioSwitched, (data) => this.handleAudioSwitched(data));
    }

    private async handleAudioSwitched(data: AVTransportEvent) {
        if (data.CurrentTrackMetaDataParsed === undefined) return;

        const currentVolume = await this.device.getVolume();
        const inputUri = data.CurrentTrackMetaDataParsed.uri;
        const currentSettings = this.audioInputVolumes.find((x) => x.InputUri === inputUri);

        this.logger.logDebug(`Current volume ${currentVolume}`);
        this.logger.logDebug(`Current settings ${JSON.stringify(currentSettings)}`);
        this.logger.logDebug(`Input details ${JSON.stringify(data)}`);
        this.logger.logDebug(`Input metadata ${JSON.stringify(data.CurrentTrackMetaDataParsed)}`);

        this.saveVolumeForPreviousInput(currentVolume);

        if (currentSettings) {
            this.device.setVolume(currentSettings.Volume);
        } else {
            this.audioInputVolumes.push({ InputUri: inputUri, Volume: currentVolume });
        }

        this.previousUri = inputUri;
    }

    private saveVolumeForPreviousInput(volume: number) {
        if (this.previousUri === undefined) return;

        const inputIndex = this.audioInputVolumes.findIndex((x) => x.InputUri === this.previousUri);
        const updatedInputVolume = { InputUri: this.previousUri, Volume: volume } as AudioInputModel;

        if (inputIndex === -1) {
            this.audioInputVolumes.push(updatedInputVolume);
        } else {
            this.audioInputVolumes[inputIndex] = updatedInputVolume;
        }

        fs.writeFile(this.settingsFile, JSON.stringify(this.audioInputVolumes), 'utf8', (error) => {
            if (error) {
                this.logger.logError('Error saving to audio input file. Volume levels may not be preserved when you switch inputs');
            }
        });
    }
}
