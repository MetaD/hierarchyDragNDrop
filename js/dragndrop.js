var hookWindow = false;

(function (interact) {
    'use strict';

    // Prevent closing window
    window.onbeforeunload = function() {
        if (hookWindow) {
            return 'Do you want to leave this page? Your progress will not be saved.';
        }
    }

    // URL parameters (id & gender)
    var userId, gender;
    var parameters = window.location.search.substring(1);
    if (parameters.length > 0) {
        var stuff = parameters.split(/[&=]/);
        userId = stuff[1];
        gender = stuff[3]    };

    var experimentId = Date.now();

    // grid
    for (var i = 0; i < 30; ++i) {
        $('#grid').append($('<tr>'));
    }
    $('#grid tr').each(function() {
        console.log(this);
        for (var i = 0; i < 30; ++i) {
            $(this).append($('<td>'));
        }
    })
    // images
    var imgNames = ['1', '2', '3', '4', '5', '6', '7', '8', '9']
    for (var i = 0; i < imgNames.length; ++i) {
        imgNames[i] = gender + imgNames[i] + '.jpg'
    }
    // shuffle image names
    for (var i = imgNames.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = imgNames[i];
        imgNames[i] = imgNames[j];
        imgNames[j] = temp;
    }
    // append images to DOM
    var marginTop = 20;
    var marginLeft = Math.round(1.02 * document.documentElement.clientHeight);  // px value of 102vh
    for (var i = 0; i < 3; ++i) {
        for (var j = 0; j < 3; ++j) {
            $('#images').append($('<img>', {
                src: 'img/' + imgNames[i*3+j],
                class: 'draggable js-drag shadow',
                style: 'margin-left:' + marginLeft.toString() + 'px; margin-top:' + marginTop.toString() + 'px;',
                height: '100px',
                width: '100px',
            }));
            marginLeft += 105;
        }
        marginTop += 105;
        marginLeft = Math.round(1.02 * document.documentElement.clientHeight);
    }
    // image position data
    var numImgDropped = 0;
    var imgDropped = {};
    for (var i = 0; i < imgNames.length; ++i) {
        imgDropped[imgNames[i]] = false;
    }

    // Initialize Firebase
    var config = {
        apiKey: "AIzaSyCv41O7LrglT7ErDtB9itFt5KG5EtyKLfE",
        authDomain: "hierarchy-351e6.firebaseapp.com",
        databaseURL: "https://hierarchy-351e6.firebaseio.com",
        storageBucket: "hierarchy-351e6.appspot.com",
        messagingSenderId: "202596010925"
    };
    firebase.initializeApp(config);
    // Sign in
    firebase.auth().signInAnonymously().then(function(user) {
        var firebaseUid = user.uid;
        console.log('Signed in as ' + firebaseUid);

        firebase.database().ref('/' + userId + '/' + experimentId).set({
            firebase_uid: firebaseUid,
            start_time: (new Date()).toUTCString(),
            gender: gender,
            image_order: imgNames
        });
    });

    // submit button
    $('#submit').click(function() {
        if ($('#submit').hasClass('disabled')) {
            return;
        }
        // image positions
        var positions = {}
        $('#images img').each(function() {
            var filename = this.currentSrc.split('/');
            filename = filename[filename.length - 1];
            filename = filename.replace('.', '_');  // because firebase doesn't allow '.' in keys
            positions[filename] = [this.x, this.y];
        });

        // firebase update
        var path = '/' + userId + '/' + experimentId;
        var update = {};
        update[path + '/duration'] = (Date.now() - experimentId) / 1000;  // in sec
        update[path + '/end_time'] = (new Date()).toUTCString();
        update[path + '/data'] = positions;

        firebase.database().ref().update(update).then(function() {
            // successful
            hookWindow = false;
            firebase.auth().currentUser.delete();
            // change DOM
            $('#everything').hide();
            $('body').append($('<p>', {
                text: 'Your response has been recorded. Thank you!',
                id: 'end-instr'
            }))
        }, function() {
            alert('Error');
            // TODO save a file?
        });
    });

    // interactive.js setup
    var transformProp;
    interact.maxInteractions(Infinity);

    // setup draggable elements
    interact('.js-drag')
        .draggable({ max: Infinity })
        .inertia(true)
        .on('dragstart', function (event) {
            event.interaction.x = parseInt(event.target.getAttribute('data-x'), 10) || 0;
            event.interaction.y = parseInt(event.target.getAttribute('data-y'), 10) || 0;
        })
        .on('dragmove', function (event) {
            event.interaction.x += event.dx;
            event.interaction.y += event.dy;

            if (transformProp) {
                event.target.style[transformProp] =
                    'translate(' + event.interaction.x + 'px, ' + event.interaction.y + 'px)';
            }
            else {
                event.target.style.left = event.interaction.x + 'px';
                event.target.style.top  = event.interaction.y + 'px';
            }
        })
        .on('dragend', function (event) {
            event.target.setAttribute('data-x', event.interaction.x);
            event.target.setAttribute('data-y', event.interaction.y);
        });

    // setup drop areas.
    // dropzone accepts every draggable
    setupDropzone('#drop', '.js-drag');

    var snapGrid = interact.createSnapGrid({
        x: 100,
        y: 100,
        offset: { x: $('#drop').offset().top + 4, y: $('#drop').offset().left + 4 }
    });

    /**
     * Setup a given element as a dropzone.
     *
     * @param {HTMLElement|String} el
     * @param {String} accept
     */
    function setupDropzone(el, accept) {
        interact(el)
            .dropzone({
                accept: accept,
                ondropactivate: function (event) {
                    addClass(event.relatedTarget, '-drop-possible');
                },
                ondropdeactivate: function (event) {
                    removeClass(event.relatedTarget, '-drop-possible');
                }
            })
            .on('dropactivate', function (event) {
                var active = event.target.getAttribute('active')|0;

                // change style if it was previously not active
                if (active === 0) {
                    addClass(event.target, '-drop-possible');
                    // event.target.textContent = 'Drop image here';
                }

                event.target.setAttribute('active', active + 1);
            })
            .on('dropdeactivate', function (event) {
                var active = event.target.getAttribute('active')|0;

                // change style if it was previously active
                // but will no longer be active
                if (active === 1) {
                    removeClass(event.target, '-drop-possible');
                    // event.target.textContent = 'Arrange images here';
                }

                event.target.setAttribute('active', active - 1);
            })
            .on('dragenter', function (event) {
                addClass(event.target, '-drop-over');
                // event.relatedTarget.textContent = 'I\'m in';

                interact('.js-drag').draggable({
                    snap: {
                        targets: [snapGrid],
                        relativePoints: [{ x: 0, y: 0 }],
                        endOnly: true
                    }
                })
                // event.draggable.snap({
                //     targets: [snapGrid],
                //     range: Infinity,
                //     elementOrigin: { x: 0, y: 0 }
                //     // endOnly: true
                // });

                // counter
                var filename = event.relatedTarget.currentSrc.split('/');
                filename = filename[filename.length - 1];
                if (!imgDropped[filename]) {
                    imgDropped[filename] = true;
                    ++numImgDropped;
                    if (numImgDropped == imgNames.length && $('#submit').hasClass('disabled')) {
                        $('#submit').removeClass('disabled');
                    }
                }
            })
            .on('dragleave', function (event) {
                removeClass(event.target, '-drop-over');
                // event.relatedTarget.textContent = 'Drag me…';
                interact('.js-drag').draggable({snap: false});

                // counter
                var filename = event.relatedTarget.currentSrc.split('/');
                filename = filename[filename.length - 1];
                if (imgDropped[filename]) {
                    imgDropped[filename] = false;
                    --numImgDropped;
                    if (numImgDropped < imgNames.length && !$('#submit').hasClass('disabled')) {
                        $('#submit').addClass('disabled');
                    }
                }
            })
            .on('drop', function (event) {
                removeClass(event.target, '-drop-over');
                // event.relatedTarget.textContent = 'Dropped';
            });
    }

    function addClass (element, className) {
        if (element.classList) {
            return element.classList.add(className);
        }
        else {
            element.className += ' ' + className;
        }
    }

    function removeClass (element, className) {
        if (element.classList) {
            return element.classList.remove(className);
        }
        else {
            element.className = element.className.replace(new RegExp(className + ' *', 'g'), '');
        }
    }

    interact(document).on('ready', function () {
        transformProp = 'transform' in document.body.style
            ? 'transform': 'webkitTransform' in document.body.style
            ? 'webkitTransform': 'mozTransform' in document.body.style
            ? 'mozTransform': 'oTransform' in document.body.style
            ? 'oTransform': 'msTransform' in document.body.style
            ? 'msTransform': null;
    });

    // hookWindow = true;

}(window.interact));
