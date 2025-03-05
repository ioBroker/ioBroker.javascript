const makeShared = (pkgs: string[]): Record<string, { requiredVersion: '*', singleton: true }> => {
    const result: Record<string, { requiredVersion: '*', singleton: true }> = {};
    pkgs.forEach(packageName => {
        result[packageName] = {
            requiredVersion: '*',
            singleton: true,
        };
    });
    return result;
};

// Admin shares these modules for all components
export const ModuleFederationShared = makeShared([
        '@emotion/react',
        '@emotion/styled',
        '@iobroker/adapter-react-v5',
        '@iobroker/json-config',
        '@iobroker/dm-gui-components',
        // '@mui/icons-material',
        '@mui/material',
        '@mui/x-date-pickers',
        'date-fns',
        'leaflet',
        'leaflet-geosearch',
        'prop-types',
        'react',
        'react-ace',
        'react-dom',
        // 'react-dropzone',
        'semver',
    ])