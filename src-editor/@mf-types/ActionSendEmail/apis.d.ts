
    export type RemoteKeys = 'ActionSendEmail/ActionSendEmail';
    type PackageType<T> = T extends 'ActionSendEmail/ActionSendEmail' ? typeof import('ActionSendEmail/ActionSendEmail') :any;