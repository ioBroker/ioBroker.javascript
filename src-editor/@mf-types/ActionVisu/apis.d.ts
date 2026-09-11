
    export type RemoteKeys = 'ActionVisu/ActionVisu';
    type PackageType<T> = T extends 'ActionVisu/ActionVisu' ? typeof import('ActionVisu/ActionVisu') :any;