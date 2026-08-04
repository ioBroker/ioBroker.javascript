declare global {
    declare module '*.svg';
    declare module '*.png';
    declare module '*.jpg';

    declare module '@mui/material/Button' {
        interface ButtonPropsColorOverrides {
            grey: true;
        }
    }

    interface Window {
        /** Set by the ioBroker admin to select a vendor specific look, e.g. "PT", "MV", "NW", "HA" */
        vendorPrefix?: string;
    }
}

export {};
