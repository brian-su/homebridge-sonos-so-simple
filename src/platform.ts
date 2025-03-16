import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig } from 'homebridge';
import { BREAKING_CHANGE_PACKAGE_VERSION, PLATFORM_NAME, PLUGIN_NAME, SOUNDBAR_NAMES, DEFAULT_EXPRESS_PORT } from './models/constants';
import { SonosPlatformAccessory } from './platformAccessory';
import { AsyncDeviceDiscovery } from 'sonos';
import { Device, Group, ZoneGroupMember } from './models/sonos-types';
import express from 'express';
import detect from 'detect-port';
import { FoundDevices, DeviceDetails, AudioInputModel, ExpressModel } from './models/models';
import helmet from 'helmet';

interface DeviceInfo {
    device: Device;
    description: any;
    uuid: string;
    roomName: string;
    modelName: string;
    configuration: string;
    isSoundbar: boolean;
    isSub: boolean;
    isSatellite: boolean;
    roomPrefix: string;
}

interface HomeTheaterSystem {
    roomName: string;
    soundbar: DeviceInfo;
    satellites: DeviceInfo[];
    subs: DeviceInfo[];
}

/**
 * HomebridgePlatform
 * This class is the main constructor for your plugin, this is where you should
 * parse the user config and discover/register accessories with Homebridge.
 */
export class SonosPlatform implements DynamicPlatformPlugin {
    public readonly Service = this.api.hap.Service;
    public readonly Characteristic = this.api.hap.Characteristic;
    // this is used to track restored cached accessories
    public readonly accessories: PlatformAccessory[] = [];

    private foundDevices: FoundDevices[] = [];
    private coordinators: string[] = [];
    private expressDetails: ExpressModel | null = null;
    private expressAppPort: number | undefined;

    constructor(
        public readonly log: Logger,
        public readonly config: PlatformConfig,
        public readonly api: API
    ) {
        this.log.debug('Finished initializing platform:', this.config.name);

        // When this event is fired it means Homebridge has restored all cached accessories from disk.
        // Dynamic Platform plugins should only register new accessories after this event was fired,
        // in order to ensure they weren't added to homebridge already. This event can also be used
        // to start discovery of new accessories.
        this.api.on('didFinishLaunching', () => {
            log.debug('Executed didFinishLaunching callback');
            // run the method to discover / register your devices as accessories
            this.discoverDevices();
        });
    }

    /**
     * This function is invoked when homebridge restores cached accessories from disk at startup.
     * It should be used to setup event handlers for characteristics and update respective values.
     */
    configureAccessory(accessory: PlatformAccessory) {
        this.log.info('Loading accessory from cache:', accessory.displayName);

        // add the restored accessory to the accessories cache so we can track if it has already been registered
        this.accessories.push(accessory);
    }

    async discoverDevices() {
        this.log.info('Getting Devices');
        let asyncDiscovery = new AsyncDeviceDiscovery();

        let sonosDevices: Device[];
        try {
            sonosDevices = await asyncDiscovery.discoverMultiple();
        } catch (error: any) {
            this.log.error(error.message);
            return;
        }

        this.log.info(`Discovered ${sonosDevices.length} Sonos devices`);

        // Get all groups information
        const groups = await sonosDevices[0].getAllGroups();
        this.log.info(`Discovered ${groups.length} Sonos groups`);

        // Get discovery mode from config (default to 'auto' if not specified)
        const discoveryMode = this.config.groupDiscoveryMode || 'auto';
        this.log.info(`Group discovery mode: ${discoveryMode}`);

        // Log all discovered groups at the start for easier debugging
        this.logSonosGroups(groups);

        // Get detailed information about each device
        const deviceInfos = await this.getDeviceDetails(sonosDevices, groups);

        // Find home theater systems by analyzing device information
        const homeTheaterSystems = this.detectHomeTheaterSystems(deviceInfos);

        // Devices to skip in individual device processing (part of multi-member groups)
        const devicesInGroups = new Set<string>();

        // Process home theater systems
        for (const system of homeTheaterSystems) {
            const allDevices = [system.soundbar, ...system.satellites, ...system.subs];

            // Mark all these devices as being in a group
            allDevices.forEach((info) => devicesInGroups.add(info.uuid));

            // Create and register the home theater group
            await this.createHomeTheaterGroup(system);
        }

        // Process multi-room groups
        if (discoveryMode === 'auto' || discoveryMode === 'groups' || discoveryMode === 'both') {
            for (const group of groups) {
                // Skip single-member groups in auto mode
                if (discoveryMode === 'auto' && group.ZoneGroupMember.length <= 1) {
                    continue;
                }

                // Skip groups where all members are part of a home theater setup
                const allMembersInHomeTheater = group.ZoneGroupMember.every((member) => devicesInGroups.has(member.UUID));

                if (allMembersInHomeTheater) {
                    continue;
                }

                // For multi-member groups, add all members to the group tracking set
                if (group.ZoneGroupMember.length > 1) {
                    group.ZoneGroupMember.forEach((member) => devicesInGroups.add(member.UUID));
                }

                // Find the coordinator device
                const coordinatorDevice = sonosDevices.find((device) => device.host === group.host);
                if (!coordinatorDevice) {
                    this.log.warn(`Couldn't find coordinator device for group ${group.Name}`);
                    continue;
                }

                await this.registerDiscoveredGroup(coordinatorDevice, group);
            }
        }

        // Process individual devices
        if (discoveryMode === 'individual' || discoveryMode === 'both' || discoveryMode === 'auto') {
            for (const device of sonosDevices) {
                // Get device UUID from its description
                const description = await device.deviceDescription();
                const deviceUuid = description.UDN.replace('uuid:', '');

                // In auto mode, skip individual devices that are part of multi-member groups or home theater
                if (discoveryMode === 'auto' && devicesInGroups.has(deviceUuid)) {
                    this.log.debug(`Skipping individual device ${description.roomName} as it's part of a multi-device group or home theater`);
                    continue;
                }

                // Identify if this device is a coordinator
                const isCoordinator = groups.some((group) =>
                    group.ZoneGroupMember.some((member) => member.UUID.includes(group.Coordinator) && device.host === group.host)
                );

                await this.registerDiscoveredDevice(device, isCoordinator);
            }
        }

        // Set up express app if needed
        if (this.config.volumeControlEndpoints) {
            try {
                this.expressDetails = await this.setupExpressApp();
            } catch (error: any) {
                this.log.error(error.message);
                return;
            }
        }

        this.removeDevicesNotDiscovered();

        // Configure express app routes
        if (this.accessories.length > 1 && this.expressDetails) {
            // 404 handler
            this.expressDetails.app.use((req, res, next) => {
                res.status(404).send({ message: 'The route - ' + req.url + '  was not found.' });
            });

            // 500 handler
            this.expressDetails.app.use((err, req, res, next) => {
                this.log.error(`Error - ${req.url}: ${err.stack}`);
                res.status(500).send({ error: err });
            });
        }

        if (this.accessories.length < 1 && this.expressDetails) {
            this.expressDetails.server.close(() => {
                this.log.info('No devices found, shutting down open ports.');
            });
        }
    }

    // Log all discovered Sonos groups for debugging
    private logSonosGroups(groups: Group[]): void {
        this.log.info('=== SONOS GROUP STRUCTURE ===');
        groups.forEach((group, index) => {
            const memberCount = group.ZoneGroupMember.length;
            const coordinator = group.ZoneGroupMember.find((m) => m.UUID.includes(group.Coordinator));
            const coordinatorName = coordinator ? coordinator.ZoneName : 'Unknown';

            this.log.info(
                `Group ${index + 1}/${groups.length}: Coordinator: ${coordinatorName} [${memberCount} member${memberCount !== 1 ? 's' : ''}]`
            );

            // Check for special group types
            const hasHomeTheaterIndicators = group.ZoneGroupMember.some(
                (m) =>
                    m.Configuration &&
                    (m.Configuration.includes('HT') || m.Configuration.includes('BONDED') || m.Configuration.includes('SATELLITES'))
            );

            const groupType = hasHomeTheaterIndicators ? 'HOME THEATER' : memberCount > 1 ? 'MULTI-ROOM' : 'STANDALONE';

            this.log.info(`  Type: ${groupType}`);

            // List all members with their configurations
            group.ZoneGroupMember.forEach((member, i) => {
                const isCoordinator = member.UUID.includes(group.Coordinator);
                const role = isCoordinator ? '[COORDINATOR]' : '';
                const config = member.Configuration ? this.getDeviceRole(member.Configuration) : '';

                this.log.info(`  ${i + 1}. ${member.ZoneName} ${role} ${config}`);
            });

            this.log.info('--------------------------');
        });
    }

    // Collect detailed information about all devices
    private async getDeviceDetails(sonosDevices: Device[], groups: Group[]): Promise<DeviceInfo[]> {
        const deviceInfos: DeviceInfo[] = [];

        for (const device of sonosDevices) {
            const desc = await device.deviceDescription();
            const uuid = desc.UDN.replace('uuid:', '');

            // Find configuration from groups data
            let configuration = '';
            for (const group of groups) {
                const member = group.ZoneGroupMember.find((m) => m.UUID === uuid);
                if (member && member.Configuration) {
                    configuration = member.Configuration;
                    break;
                }
            }

            // Extract the base room name without device type suffixes
            const roomPrefix = desc.roomName.replace(/\s+(Sonos|One SL|Sub|Beam|Arc|Ray|Playbar|Playbase).*$/i, '').trim();

            // Identify device types
            const isSoundbar = SOUNDBAR_NAMES.some(
                (name) =>
                    desc.modelName.toUpperCase().includes(name) ||
                    (configuration && (configuration.toUpperCase().includes(name) || configuration.includes('HT')))
            );

            const isSub =
                desc.modelName.toUpperCase().includes('SUB') ||
                desc.roomName.toUpperCase().includes('SUB') ||
                (configuration ? configuration.includes('SUB') : false);

            const isSatellite =
                desc.modelName.toUpperCase().includes('ONE') ||
                desc.roomName.toUpperCase().includes('ONE SL') ||
                (configuration ? configuration.includes('SATELLITE') || configuration.includes('LEFT') || configuration.includes('RIGHT') : false);

            deviceInfos.push({
                device,
                description: desc,
                uuid,
                roomName: desc.roomName,
                modelName: desc.modelName,
                configuration,
                isSoundbar,
                isSub,
                isSatellite,
                roomPrefix
            });
        }

        return deviceInfos;
    }

    // Detect home theater systems by analyzing device relationships
    private detectHomeTheaterSystems(deviceInfos: DeviceInfo[]): HomeTheaterSystem[] {
        const homeTheaterSystems: HomeTheaterSystem[] = [];

        // Group devices by room prefix
        const devicesByRoom = new Map<string, DeviceInfo[]>();
        deviceInfos.forEach((info) => {
            if (!devicesByRoom.has(info.roomPrefix)) {
                devicesByRoom.set(info.roomPrefix, []);
            }
            devicesByRoom.get(info.roomPrefix)?.push(info);
        });

        // Analyze each room for home theater components
        devicesByRoom.forEach((devices, roomPrefix) => {
            if (devices.length < 2) return; // Need at least 2 devices for a home theater

            this.log.debug(`Analyzing room "${roomPrefix}" with ${devices.length} devices for home theater components`);

            // Find soundbar
            const soundbar = devices.find((d) => d.isSoundbar);
            if (!soundbar) return;

            // Find satellites and subwoofers
            const satellites = devices.filter((d) => d.isSatellite);
            const subs = devices.filter((d) => d.isSub);

            // If we have a soundbar and either satellites or subs, we have a home theater
            if (satellites.length > 0 || subs.length > 0) {
                this.log.info(`Detected home theater system in "${roomPrefix}" with:
  - Soundbar: ${soundbar.roomName}
  - Satellites: ${satellites.map((s) => s.roomName).join(', ') || 'None'}
  - Subwoofer: ${subs.map((s) => s.roomName).join(', ') || 'None'}`);

                homeTheaterSystems.push({
                    roomName: roomPrefix,
                    soundbar,
                    satellites,
                    subs
                });
            }
        });

        return homeTheaterSystems;
    }

    // Create and register a home theater group
    private async createHomeTheaterGroup(system: HomeTheaterSystem): Promise<void> {
        const { roomName, soundbar, satellites, subs } = system;
        const allDevices = [soundbar, ...satellites, ...subs];

        // Create a synthetic group for this home theater
        const homeTheaterGroup: Group = {
            Coordinator: soundbar.uuid,
            ID: `hometheater-${roomName.replace(/\s+/g, '-')}`,
            ZoneGroupMember: allDevices.map(
                (d) =>
                    ({
                        UUID: d.uuid,
                        ZoneName: d.roomName,
                        Configuration: d.configuration
                    }) as ZoneGroupMember
            ),
            Name: `${roomName} Home Theater`,
            host: soundbar.device.host,
            port: soundbar.device.port,
            CoordinatorDevice: () => soundbar.device
        };

        this.log.info(`Created home theater group for ${roomName} with ${allDevices.length} components`);

        // Register the home theater group
        await this.registerDiscoveredHomeTheater(soundbar.device, homeTheaterGroup);
    }

    async registerDiscoveredDevice(sonosDevice: Device, isCoordinator: boolean) {
        let description = await sonosDevice.deviceDescription();
        let displayNameUpperCase = description.displayName.toUpperCase();
        let IsSoundBar = SOUNDBAR_NAMES.includes(displayNameUpperCase);

        if (this.config.soundbarsOnly && !IsSoundBar) return;

        // Use room or device name based on config
        let deviceDisplayName = this.config.roomNameAsName ? description.roomName : description.displayName;

        // Create a unique ID for the device based on MAC
        const uuid = this.api.hap.uuid.generate(`${description.MACAddress}:${BREAKING_CHANGE_PACKAGE_VERSION}`);
        this.foundDevices.push({ uuid: uuid, name: deviceDisplayName });

        this.log.debug(`Found device - UUID: ${uuid}, Name: ${deviceDisplayName}, Coordinator: ${isCoordinator}`);

        const existingAccessory = this.accessories.find((accessory) => accessory.UUID === uuid);

        const deviceDetailsModel = {
            UUID: uuid,
            Host: sonosDevice.host,
            IsSoundBar: IsSoundBar,
            Manufacturer: description.manufacturer,
            SerialNumber: description.serialNum,
            ModelName: description.modelName,
            FirmwareVersion: description.softwareVersion,
            RoomName: description.roomName,
            DisplayName: deviceDisplayName,
            ExpressAppPort: this.expressAppPort,
            AudioInputVolumes: [],
            UpdateAudioVolumes: this.updateInputVolumeLevels.bind(this),
            IsGroup: false,
            IsCoordinator: isCoordinator
        } as DeviceDetails;

        if (existingAccessory) {
            this.log.info(`Adding device ${deviceDisplayName} from cache`);
            existingAccessory.displayName = deviceDisplayName;
            deviceDetailsModel.AudioInputVolumes = existingAccessory.context.device.AudioInputVolumes;
            existingAccessory.context.device = deviceDetailsModel;
            new SonosPlatformAccessory(this, existingAccessory, this.expressDetails);

            this.log.debug(`EXISTING DEVICE DETAILS: ${JSON.stringify(existingAccessory.context.device.AudioInputVolumes)}`);

            this.api.updatePlatformAccessories([existingAccessory]);
            return;
        }

        this.log.info(`Adding device ${deviceDisplayName} as new device`);
        const accessory = new this.api.platformAccessory(deviceDisplayName, uuid);
        accessory.context.device = deviceDetailsModel;
        new SonosPlatformAccessory(this, accessory, this.expressDetails);

        this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
    }

    async registerDiscoveredGroup(coordinatorDevice: Device, group: Group) {
        let description = await coordinatorDevice.deviceDescription();
        let displayNameUpperCase = description.displayName.toUpperCase();
        let IsSoundBar = SOUNDBAR_NAMES.includes(displayNameUpperCase);

        if (this.config.soundbarsOnly && !IsSoundBar) {
            this.log.debug(`Skipping non-soundbar group: ${group.Name}`);
            return;
        }

        // For groups, use the group name based on configuration
        let groupName = '';
        let isGrouped = group.ZoneGroupMember.length > 1;
        const groupNamingFormat = this.config.groupNamingFormat || 'coordinator_plus';

        // Check if this is likely a home theater setup
        const isHomeTheater = group.ZoneGroupMember.some(
            (member) =>
                member.Configuration &&
                (member.Configuration.includes('HT') || member.Configuration.includes('BONDED') || member.Configuration.includes('SATELLITES'))
        );

        // Number of surround speakers
        const possibleSurrounds = group.ZoneGroupMember.length >= 3;
        const homeTheaterSetup = isHomeTheater || (possibleSurrounds && IsSoundBar);

        // If there are multiple devices in the group
        if (isGrouped) {
            const coordinatorMember = group.ZoneGroupMember.find((member) => member.UUID.includes(group.Coordinator));
            const coordinatorZoneName = coordinatorMember?.ZoneName || description.roomName;

            // Special naming for home theater setups
            if (homeTheaterSetup) {
                groupName = `${coordinatorZoneName} Home Theater`;
                this.log.info(`Creating home theater accessory: "${groupName}"`);

                // List the components of the home theater setup
                this.log.debug('Home theater components:');
                group.ZoneGroupMember.forEach((member, i) => {
                    const role = this.getDeviceRole(member.Configuration || '');
                    const isCoord = member.UUID.includes(group.Coordinator) ? ' (coordinator)' : '';
                    this.log.debug(`  ${i + 1}. ${member.ZoneName}${isCoord} ${role}`);
                });
            } else {
                switch (groupNamingFormat) {
                    case 'coordinator_plus':
                        // Format: "Living Room (2)"
                        groupName = `${coordinatorZoneName} (${group.ZoneGroupMember.length - 1})`;
                        break;

                    case 'members_list':
                        // Format: "Living Room, Kitchen, Office"
                        groupName = group.ZoneGroupMember.map((m) => m.ZoneName).join(', ');
                        break;

                    case 'simple':
                        // Format: "Sonos Group Living Room"
                        groupName = `Sonos Group ${coordinatorZoneName}`;
                        break;

                    default:
                        // Default fallback
                        groupName = `${coordinatorZoneName} Group`;
                }
                this.log.info(`Creating group accessory: "${groupName}" with format ${groupNamingFormat}`);

                // List the members of the group
                this.log.debug('Group members:');
                group.ZoneGroupMember.forEach((member, i) => {
                    const isCoord = member.UUID.includes(group.Coordinator) ? ' (coordinator)' : '';
                    this.log.debug(`  ${i + 1}. ${member.ZoneName}${isCoord}`);
                });
            }
        } else {
            // Single device group - use its zone name
            groupName = group.ZoneGroupMember[0].ZoneName || description.roomName;
            this.log.info(`Creating single device group: "${groupName}"`);
        }

        // Use configured preference for display name
        let deviceDisplayName = this.config.roomNameAsName ? groupName : isGrouped ? groupName : description.displayName;

        // Create a unique ID for the group based on coordinator MAC plus group ID
        const uuid = this.api.hap.uuid.generate(`${description.MACAddress}:${group.ID}:${BREAKING_CHANGE_PACKAGE_VERSION}`);
        this.foundDevices.push({ uuid: uuid, name: deviceDisplayName });

        this.log.debug(`HomeKit accessory - UUID: ${uuid}, Name: "${deviceDisplayName}"`);

        if (homeTheaterSetup) {
            this.log.debug(`Home theater hardware: ${description.modelName} (${description.displayName})`);
        }

        const existingAccessory = this.accessories.find((accessory) => accessory.UUID === uuid);

        const deviceDetailsModel = {
            UUID: uuid,
            Host: coordinatorDevice.host,
            IsSoundBar: IsSoundBar,
            Manufacturer: description.manufacturer,
            SerialNumber: description.serialNum,
            ModelName: description.modelName,
            FirmwareVersion: description.softwareVersion,
            RoomName: groupName,
            DisplayName: deviceDisplayName,
            ExpressAppPort: this.expressAppPort,
            AudioInputVolumes: [],
            UpdateAudioVolumes: this.updateInputVolumeLevels.bind(this),
            // Group-related info
            IsGroup: isGrouped,
            IsHomeTheater: homeTheaterSetup,
            GroupID: group.ID,
            GroupName: groupName,
            GroupMembers: group.ZoneGroupMember.map((m) => m.ZoneName)
        } as DeviceDetails;

        if (existingAccessory) {
            this.log.info(`Updating group "${deviceDisplayName}" from cache`);
            existingAccessory.displayName = deviceDisplayName;
            deviceDetailsModel.AudioInputVolumes = existingAccessory.context.device.AudioInputVolumes;
            existingAccessory.context.device = deviceDetailsModel;
            new SonosPlatformAccessory(this, existingAccessory, this.expressDetails);

            this.api.updatePlatformAccessories([existingAccessory]);
            return;
        }

        this.log.info(`Registering new group "${deviceDisplayName}" with HomeKit`);
        const accessory = new this.api.platformAccessory(deviceDisplayName, uuid);
        accessory.context.device = deviceDetailsModel;
        new SonosPlatformAccessory(this, accessory, this.expressDetails);

        this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
    }

    async registerDiscoveredHomeTheater(coordinatorDevice: Device, group: Group) {
        let description = await coordinatorDevice.deviceDescription();
        let displayNameUpperCase = description.displayName.toUpperCase();
        let IsSoundBar = SOUNDBAR_NAMES.includes(displayNameUpperCase);

        if (this.config.soundbarsOnly && !IsSoundBar && !group.Name.includes('Home Theater')) {
            this.log.debug(`Skipping non-soundbar home theater: ${group.Name}`);
            return;
        }

        // Special name for home theater
        const roomName = group.Name.replace(' Home Theater', '');
        const groupName = group.Name;
        this.log.info(`Creating home theater accessory: "${groupName}"`);

        // List the components of the home theater setup
        this.log.info('Home theater components:');
        group.ZoneGroupMember.forEach((member, i) => {
            const isCoord = member.UUID.includes(group.Coordinator) ? ' (coordinator)' : '';
            const role = this.getDeviceRole(member.Configuration || '');
            this.log.info(`  ${i + 1}. ${member.ZoneName}${isCoord} ${role}`);
        });

        // Use configured preference for display name
        let deviceDisplayName = this.config.roomNameAsName ? groupName : groupName;

        // Create a unique ID for the home theater group
        const uuid = this.api.hap.uuid.generate(`${description.MACAddress}:${group.ID}:${BREAKING_CHANGE_PACKAGE_VERSION}`);
        this.foundDevices.push({ uuid: uuid, name: deviceDisplayName });

        this.log.debug(`HomeKit accessory - UUID: ${uuid}, Name: "${deviceDisplayName}"`);
        this.log.debug(`Home theater hardware: ${description.modelName} (${description.displayName})`);

        const existingAccessory = this.accessories.find((accessory) => accessory.UUID === uuid);

        const deviceDetailsModel = {
            UUID: uuid,
            Host: coordinatorDevice.host,
            IsSoundBar: true,
            Manufacturer: description.manufacturer,
            SerialNumber: description.serialNum,
            ModelName: description.modelName,
            FirmwareVersion: description.softwareVersion,
            RoomName: roomName,
            DisplayName: deviceDisplayName,
            ExpressAppPort: this.expressAppPort,
            AudioInputVolumes: [],
            UpdateAudioVolumes: this.updateInputVolumeLevels.bind(this),
            // Group-related info
            IsGroup: true,
            IsHomeTheater: true,
            GroupID: group.ID,
            GroupName: groupName,
            GroupMembers: group.ZoneGroupMember.map((m) => m.ZoneName)
        } as DeviceDetails;

        if (existingAccessory) {
            this.log.info(`Updating home theater "${deviceDisplayName}" from cache`);
            existingAccessory.displayName = deviceDisplayName;
            deviceDetailsModel.AudioInputVolumes = existingAccessory.context.device.AudioInputVolumes;
            existingAccessory.context.device = deviceDetailsModel;
            new SonosPlatformAccessory(this, existingAccessory, this.expressDetails);

            this.api.updatePlatformAccessories([existingAccessory]);
            return;
        }

        this.log.info(`Registering new home theater "${deviceDisplayName}" with HomeKit`);
        const accessory = new this.api.platformAccessory(deviceDisplayName, uuid);
        accessory.context.device = deviceDetailsModel;
        new SonosPlatformAccessory(this, accessory, this.expressDetails);

        this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
    }

    removeDevicesNotDiscovered() {
        this.log.info('Got All Devices');
        this.log.debug(`Sonos found the following: ${JSON.stringify(this.foundDevices)}`);

        const removedAccessories = this.accessories.filter((accessory) => {
            return this.foundDevices.map((x) => x.uuid).indexOf(accessory.UUID) === -1;
        });

        if (removedAccessories.length > 0) this.log.info('Now removing devices registered with homebridge but not discovered from Sonos');

        removedAccessories.forEach((accessory) => {
            let deviceDetails = accessory.context.device as DeviceDetails;
            this.log.info(`Removing ${deviceDetails.ModelName} ${deviceDetails.Host}`);
        });

        this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, removedAccessories);
    }

    private async setupExpressApp(): Promise<ExpressModel> {
        this.log.info('Setting up Express server');
        var targetPort = DEFAULT_EXPRESS_PORT;
        var actualPort = 0;
        var loopCount = 0;

        //Loop to find an available port.
        while (targetPort !== actualPort) {
            if (loopCount > 100) throw Error('Volume Endpoints feature unavailable: Tried 100 ports, got nada, gave up. Sorry.');

            var portReturn = await detect(targetPort);
            targetPort === portReturn ? (actualPort = portReturn) : (targetPort = portReturn);
            this.log.debug(`Target: ${targetPort}, Actual: ${actualPort}`);

            loopCount++;
        }

        var app = express();
        var server = app.listen(actualPort, () => {
            var address: string = '';
            var addressInfo = server.address();

            if (typeof addressInfo === 'string') {
                address = addressInfo;
            } else if (addressInfo && addressInfo.address) {
                address = JSON.stringify(addressInfo);
            }

            this.log.info(`Sonos Device Control endpoints are now listening on port ${actualPort} at ${address}`);
        });

        app.use(helmet());

        this.expressAppPort = actualPort;

        return { app: app, server: server };
    }

    private updateInputVolumeLevels(uuid: string, currentSettings: AudioInputModel, currentSavedSettings: AudioInputModel[]) {
        const existingAccessory = this.accessories.find((accessory) => accessory.UUID === uuid);
        if (!existingAccessory) return;

        const currentIndex = currentSavedSettings.findIndex((x) => x.InputUri === currentSettings.InputUri);
        currentIndex === -1 ? currentSavedSettings.push(currentSettings) : (currentSavedSettings[currentIndex] = currentSettings);

        this.log.debug(`Saving Audio Details ${JSON.stringify(currentSettings)}`);

        this.api.updatePlatformAccessories([existingAccessory]);
    }

    // Helper function to interpret device configuration strings
    private getDeviceRole(configuration: string): string {
        if (!configuration) return '';

        const role: string[] = [];
        if (configuration.includes('HT')) role.push('HOME THEATER');
        if (configuration.includes('SATELLITES')) role.push('SATELLITE');
        if (configuration.includes('SUB') || configuration.includes('SUBWOOFER')) role.push('SUBWOOFER');
        if (configuration.includes('LEFT')) role.push('LEFT');
        if (configuration.includes('RIGHT')) role.push('RIGHT');
        if (configuration.includes('BONDED')) role.push('BONDED');

        return role.length ? `[${role.join(', ')}]` : '';
    }
}
