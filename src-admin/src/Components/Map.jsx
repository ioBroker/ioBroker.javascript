import React, { Component } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import { useMap } from 'react-leaflet/hooks';
// import { OpenStreetMapProvider } from 'leaflet-geosearch';
import 'leaflet/dist/leaflet.css';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import markerRetinaIcon from 'leaflet/dist/images/marker-icon-2x.png';

function MyMapComponent(props) {
    const map = useMap();
    props.addMap && props.addMap(map);
    return null;
}

class Map extends Component {
    constructor(props) {
        super(props);
        this.state = {
            zoom: 14,
            latitude: this.props.latitude,
            longitude: this.props.longitude,
            width: 0,
            height: 0,
        };
        this.divRef = React.createRef();
        this.marker = null;
    }

    onMap = map => {
        if (!this.map || this.map !== map) {
            this.map = map;
            const center = [
                parseFloat(this.state.latitude !== undefined ? this.state.latitude : 50) || 0,
                parseFloat(this.state.longitude !== undefined ? this.state.longitude : 10) || 0,
            ];
            const customIcon = window.L.icon({
                iconUrl: markerIcon,
                iconRetinaUrl: markerRetinaIcon,
                shadowUrl: markerShadow,

                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34],
                tooltipAnchor: [16, -28],
                shadowSize: [41, 41],
            });

            this.marker = window.L.marker(center, {
                draggable: true,
                title: 'Resource location',
                alt: 'Resource Location',
                riseOnHover: true,
                icon: customIcon,
            })
                .addTo(map)
                .bindPopup('Popup for any custom information.')
                .on({ dragend: evt => this.onMarkerDragend(evt) });
        }
    };

    componentDidUpdate() {
        if (
            this.map &&
            this.marker &&
            (this.props.latitude !== this.state.latitude || this.props.longitude !== this.state.longitude)
        ) {
            this.setState({ latitude: this.props.latitude, longitude: this.props.longitude }, () => {
                this.latLongTimer && clearTimeout(this.latLongTimer);
                this.latLongTimer = setTimeout(() => {
                    this.latLongTimer = null;
                    this.map.flyTo([this.state.latitude, this.state.longitude]);
                    this.marker.setLatLng([this.state.latitude, this.state.longitude]);
                }, 500);
            });
        }

        if (
            this.divRef.current &&
            (this.state.width !== this.divRef.current.clientWidth ||
                this.state.height !== this.divRef.current.clientHeight)
        ) {
            setTimeout(() => {
                this.setState({ width: this.divRef.current.clientWidth, height: this.divRef.current.clientHeight });
            }, 100);
        }
    }

    onMarkerDragend = evt => {
        if (this.props.readOnly) {
            this.map.flyTo([this.state.latitude, this.state.longitude]);
            this.marker.setLatLng([this.state.latitude, this.state.longitude]);
            return;
        }
        const ll = JSON.parse(JSON.stringify(evt.target._latlng));
        this.setState({ latitude: ll.lat, longitude: ll.lng }, () =>
            this.props.onChange(this.state.latitude, this.state.longitude),
        );
    };

    render() {
        const center = [
            parseFloat(this.props.latitude !== undefined ? this.props.latitude : 50) || 0,
            parseFloat(this.props.longitude !== undefined ? this.props.longitude : 10) || 0,
        ];
        const { zoom } = this.state;

        console.log(this.state.width, this.state.height);
        return (
            <div
                style={{ width: '100%', height: '100%', minHeight: 350 }}
                ref={this.divRef}
            >
                {this.state.width && this.state.height ? (
                    <MapContainer
                        style={{
                            width: '100%',
                            height: '100%',
                            minHeight: 350,
                            borderRadius: 5,
                        }}
                        center={center}
                        zoom={zoom}
                        maxZoom={18}
                        attributionControl={false}
                        zoomControl
                        doubleClickZoom
                        scrollWheelZoom
                        dragging={!this.props.readOnly}
                        animate
                        easeLinearity={0.35}
                    >
                        <TileLayer url="https://{s}.tile.osm.org/{z}/{x}/{y}.png" />
                        <MyMapComponent addMap={map => this.onMap(map)} />
                    </MapContainer>
                ) : null}
            </div>
        );
    }
}

export default Map;
