var FOURSQUARE_CLIENT_ID = 'UYPPZ5SUY1S52HVVUP0IDQHVQXINNCRUE4NWLW41IXU3MQF0';
var FOURSQUARE_CLIENT_SECRET = '10MV1O1UYUZFFTBEY2GRQPLAQW3IMEGCN5WXEJ4X1X12YOEG';

var map;
var service;
var locations = [];

// Callback for Foursquare call success
var venueSearchSuccess = function (data) {

    // Parse response, store venues
    var venues = data.response.venues;
    for (i = 0; i < venues.length; i++) {
        var venue = venues[i];

        // Store the venue as a location
        locations.push({
            id: venue.id,
            lat: venue.location.lat,
            lng: venue.location.lng,
            name: venue.name,
            addr: venue.location.formattedAddress,
            contact: venue.contact.formattedPhone || 'Not Available',
            active: false
        });
    }

    // Apply KO bindings, initialize MVVM
    ko.applyBindings(new ViewModel(locations));
};

// Callback for Foursquare call error
var venueSearchError = function (error) {
    alert("No locations could be retrieved!");
};

// Error callback for Google Maps API
function loadMapError() {
    alert("Google Maps not available!");
};

// Callback for Google Maps initialization
function initMap() {

    // Create map centered to Frankfurt am Main
    var center = new google.maps.LatLng(50.110922, 8.682127);
    map = new google.maps.Map(document.getElementById('map'), {
        center: center,
        zoom: 13,
    });

    // Search venues around the center and initialize
    var foursquareVenuesUrl = 'https://api.foursquare.com/v2/venues/search?';

    foursquareVenuesUrl += 'client_id=' + FOURSQUARE_CLIENT_ID + '&';
    foursquareVenuesUrl += 'client_secret=' + FOURSQUARE_CLIENT_SECRET + '&';
    foursquareVenuesUrl += 'v=20130815&ll=' + center.lat() + ',' + center.lng() + '&';
    foursquareVenuesUrl += 'query=döner&intent=browse&radius=5000';

    // AJAX call to populate locations & initialize the View Model
    $.ajax({
        dataType: 'json',
        url: foursquareVenuesUrl,
        success: venueSearchSuccess,
        error: venueSearchError
    });
};

// Main View Model
var ViewModel = function (defaultLocations) {

    var self = this;

    // Adds marker to a location
    self.addMarker = function (location) {
        var marker = new google.maps.Marker({
            map: map,
            position: { lat: location.lat, lng: location.lng },
            title: location.name,
            animation: google.maps.Animation.DROP,
            id: location.id
        });

        // Store the marker as location property
        location.marker = marker;
    };

    // Adds info window to a location
    self.addInfoWindow = function (location) {
        var info = '<div id="info">' +
            '<h4>' + location.name + '</h4>' +
            '<h5>Address:</h5>' +
            '<p>' + location.addr + '</p>' +
            '<h5>Contact:</h5>' +
            '<p>' + location.contact + '</p>' +
            '</div>';

        // Create an info window with a content
        var infoWindow = new google.maps.InfoWindow({
            content: info
        });

        // Sets marker animation and handles info window when marker is clicked
        google.maps.event.addListener(location.marker, 'click', function() {
            if (location.marker.getAnimation() != null) {
                location.marker.setAnimation(null);
                infoWindow.close();
            } else {
                location.marker.setAnimation(google.maps.Animation.BOUNCE);
                infoWindow.open(map, location.marker);
            }
        });

        // Disables marker animation when close is clicked
        google.maps.event.addListener(infoWindow, 'closeclick', function() {
            location.marker.setAnimation(null);
        });
        
        // Store the info window as location property
        location.infoWindow = infoWindow;

    };

    // Creates a marker and info window for each location
    (function () {
        for (i = 0; i < defaultLocations.length; i++) {
            loc = defaultLocations[i];
            
            // Add marker
            self.addMarker(loc);

            // Add info window
            self.addInfoWindow(loc);
        }
    })();

    // Stores filter text 
    self.filter = ko.observable('');

    // Stores selected location
    self.selectedLocationId = ko.observable('');

    // Updates selected location observable
    self.locationSelected = function (location) {
        self.selectedLocationId(location.id);
    };

    // Handles locations and marker visibility depending on the filter
    self.locations = ko.computed(function () {
        var filter = self.filter().toLowerCase();

        // Set marker animations, info windows depending on the active locations
        for (i = 0; i < defaultLocations.length; i++) {
            loc = defaultLocations[i];
            if (loc.id == self.selectedLocationId()) {
                loc.marker.setAnimation(google.maps.Animation.BOUNCE);
                loc.infoWindow.open(map, loc.marker);
            } else {
                loc.marker.setAnimation(null);
                loc.infoWindow.close();
            }
        };

        // If there is a filter, make only relevant markers visible
        if (filter) {
            return ko.utils.arrayFilter(defaultLocations, function (location) {
                var assert = location.name.toLowerCase().indexOf(filter) >= 0;
                location.marker.setVisible(assert);
                return assert;
            });
        // If there is no filter, make everything visible
        } else {
            ko.utils.arrayForEach(defaultLocations, function (location) {
                location.marker.setVisible(true);
            });
            return defaultLocations;
        }
    });
};
