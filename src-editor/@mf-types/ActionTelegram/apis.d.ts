
    export type RemoteKeys = 'ActionTelegram/ActionTelegram';
    type PackageType<T> = T extends 'ActionTelegram/ActionTelegram' ? typeof import('ActionTelegram/ActionTelegram') :any;