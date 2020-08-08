// Last time updated at Dec 31, 2016, 10:54:23

// Muaz Khan      - www.MuazKhan.com
// MIT License    - www.WebRTC-Experiment.com/licence

// Source Code    - github.com/muaz-khan/Translator
// Demo           - www.webrtc-experiment.com/Translator

function Translator() {
    this.voiceToText = function(callback, language) {
        initTranscript(callback, language);
    };

    this.speakTextUsingRobot = function(text, args) {
        args = args || { };

        if (!args.amplitude) args.amplitude = 100;
        if (!args.wordgap) args.wordgap = 0;
        if (!args.pitch) args.pitch = 50;
        if (!args.speed) args.speed = 175;

        // args.workerPath
        // args.callback

        Speaker.Speak(text, args);
    };




    var recognition;

    function initTranscript(callback, language) {
        if (recognition) recognition.stop();

        window.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        recognition = new SpeechRecognition();

        recognition.lang = language || 'en-US';

        console.log('SpeechRecognition Language', recognition.lang);

        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onresult = function(event) {
            for (var i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    callback(event.results[i][0].transcript);
                }
            }
        };

        recognition.onend = function() {
            if(recognition.dontReTry === true) {
                return;
            }

            initTranscript(callback, language);
        };

        recognition.onerror = function(e) {
            if(e.error === 'audio-capture') {
                recognition.dontReTry = true;
                alert('Failed capturing audio i.e. microphone. Please check console-logs for hints to fix this issue.');
                console.error('No microphone was found. Ensure that a microphone is installed and that microphone settings are configured correctly. https://support.google.com/chrome/bin/answer.py?hl=en&answer=1407892');
                console.error('Original', e.type, e.message.length || e);
                return;
            }

            console.error(e.type, e.error, e.message);
        };

        recognition.start();
    }

    var self = this;
    self.processInWebWorker = function(args) {
        console.log('Downloading worker file. Its about 2MB in size.');

        if (!self.speakWorker && args.onWorkerFileDownloadStart) args.onWorkerFileDownloadStart();

        var blob = URL.createObjectURL(new Blob(['importScripts("' + (args.workerPath || '//www.webrtc-experiment.com/Robot-Speaker.js') + '");this.onmessage =  function (event) {postMessage(generateSpeech(event.data.text, event.data.args));}; postMessage("worker-file-downloaded");'], {
            type: 'application/javascript'
        }));

        var worker = new Worker(blob);
        URL.revokeObjectURL(blob);
        return worker;
    };

    var Speaker = {
        Speak: function(text, args) {
            var callback = args.callback;
            var onSpeakingEnd = args.onSpeakingEnd;

            if (!speakWorker) {
                self.speakWorker = self.processInWebWorker(args);
            }

            var speakWorker = self.speakWorker;

            speakWorker.onmessage = function(event) {

                if (event.data == 'worker-file-downloaded') {
                    console.log('Worker file is download ended!');
                    if (args.onWorkerFileDownloadEnd) args.onWorkerFileDownloadEnd();
                    return;
                }

                function encode64(data) {
                    var BASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
                    var PAD = '=';
                    var ret = '';
                    var leftchar = 0;
                    var leftbits = 0;
                    for (var i = 0; i < data.length; i++) {
                        leftchar = (leftchar << 8) | data[i];
                        leftbits += 8;
                        while (leftbits >= 6) {
                            var curr = (leftchar >> (leftbits - 6)) & 0x3f;
                            leftbits -= 6;
                            ret += BASE[curr];
                        }
                    }
                    if (leftbits == 2) {
                        ret += BASE[(leftchar & 3) << 4];
                        ret += PAD + PAD;
                    } else if (leftbits == 4) {
                        ret += BASE[(leftchar & 0xf) << 2];
                        ret += PAD;
                    }
                    return ret;
                }

                var audio_url = 'data:audio/x-wav;base64,' + encode64(event.data);

                if (callback) {
                    callback(audio_url);
                } else {
                    var audio = document.createElement('audio');
                    audio.onended = function() {
                        if (onSpeakingEnd) onSpeakingEnd();
                    };
                    audio.src = audio_url;
                    audio.play();
                }
            };

            var _args = args;
            if (_args.onSpeakingEnd) delete _args.onSpeakingEnd;
            if (_args.callback) delete _args.callback;
            if (_args.onWorkerFileDownloadEnd) delete _args.onWorkerFileDownloadEnd;
            if (_args.onWorkerFileDownloadStart) delete _args.onWorkerFileDownloadStart;

            speakWorker.postMessage({ text: text, args: _args });
        }
    };
    
}
