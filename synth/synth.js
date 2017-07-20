const KEYS = {
  "c_major_garbage": [65.41, 73.42, 82.41, 87.31, 98.00, 110.00, 123.47, 130.81, 146.83, 164.81, 174.61, 196.00, 220.00, 246.94, 261.63, 293.66],
  "dj_barakas": [],
  "depressed_daikon": [],
  "polka_savage": []
}

// global VCO settings
var attack = 0.01,
    release = 0.15,
    speed = 200,
    lfoGain = 8,
    lfoFrequency = 10,
    courseTune = 0,
    vclpf = 10000;

class Oscillator {
  constructor(pitch, context, masterVolume) {
    this.context = context;
    this.vco = context.createOscillator();
    this.vco.frequency.value = pitch;
    this.vca = context.createGain();
    this.vco.connect(this.vca);
    this.vca.connect(masterVolume);
    this.vco.type = "square";
    this.vco.start();
    this.vca.gain.value = 0;
    this.lfoGain = context.createGain();
    this.lfo = context.createOscillator();
    this.lfo.type = "sine";
    this.lfoGain.gain.value = 0;
    this.lfoGain.connect(this.vco.frequency);
    this.lfo.frequency.value = 0;
    this.lfo.connect(this.lfoGain);
    this.lfo.start();
  }

  // envelope generator
  trigger() {
    this.vca.gain.setTargetAtTime(1, this.context.currentTime, attack);
    this.vca.gain.setTargetAtTime(0, this.context.currentTime + attack, release);
  }
}

class Sequencer {
  constructor(vcoCount, key, sequenceData) {
    this.vcoCount = vcoCount;
    this.oscillators = [];
    this.key = key;
    this.sequenceData = sequenceData;
    this.currentStep = 0;
    this.context = new window.AudioContext();
    this.masterVolume = this.context.createGain();
    this.filter = this.context.createBiquadFilter();
    this.filter.type  = "lowpass";
    this.filter.frequency.value = 10000;
    this.filter.connect(this.context.destination);
    this.lfoGain = this.context.createGain();
    this.lfo = this.context.createOscillator();
    this.lfo.type = "sine";
    this.lfoGain.gain.value = 0;
    this.lfoGain.connect(this.filter.detune);
    this.lfo.frequency.value = 0;
    this.lfo.connect(this.lfoGain);
    this.lfo.start();
    this.genVCOs();
    this.masterVolume.gain.value = 0.5;
    this.masterVolume.connect(this.filter);
    this.analyser = this.context.createAnalyser();
    this.masterVolume.connect(this.analyser);
  }
  genVCOs() {
    for(var i=1; i <= this.vcoCount; i++) {
      var pitch = KEYS['c_major_garbage'][i-1];
      var osc = new Oscillator(pitch, this.context, this.masterVolume);
      this.oscillators.push(osc);
    }
  }

  toggle(id){
    var str = this.sequenceData.split("")
    str[id] = str[id] === "1" ? "0" : "1"
    this.sequenceData = str.join("")
    $.ajax({
      url: `http://localhost:3000/sequences/${this.sequenceId}`,
      type: "PUT",
      data: {
        title: this.sequenceTitle,
        data: this.sequenceData,
        speed: 200,
        width: 300
      }
    }).done(function(data){
    })
  }

  // plays oscillators at indeces in osillatorArray
  // corresponding to indeces in current step sequence data where digit is 1
  step() {
    var stepDads = this.sequenceData.substr(this.currentStep * this.vcoCount, this.vcoCount)
    var indeces = this.getIndeces(stepDads)
    indeces.forEach(index => {
      this.oscillators[index].trigger();
    });

    highlightRow(this.currentStep, indeces)

    if(this.currentStep < 15) {
      this.currentStep += 1;
    } else {
      this.currentStep = 0;
    }
    this.timeoutId = setTimeout(function(scope){ scope.step()}, speed, this)
  }

  getIndeces(stepDads){
    let indeces = [];
    for(let i = 0; i < stepDads.length; i++){
      if(stepDads[i] === "1"){ indeces.push(i)}
    }
    return indeces;
  }

  startSequencer() {
    // starts interval
    // saves intervalID as instance variable
    // interval triggers step method, every speed milliseconds
    this.timeoutId = setTimeout(function(scope){ scope.step()}, speed, this)
  }

  stopSequencer() {
    clearTimeout(this.timeoutId);
  }

}

var sequencer = new Sequencer(16, 'c_major',"0000000000000001000000000000000000000000000010000000000000010000000000000010000000000000010000000000000010000000000000000000000100000010010000000000010000000000000010000000000000010000000000000000000000000000000010000000000010000000000000000000001000000001" );

function toggleMarked(element){

  if(element.hasClass("marked")){
    element.removeClass("marked")
  } else {
    element.addClass("marked")
  }
}

function generateGrid(){
  for(var i = 0; i < sequencer.vcoCount; i++){
    $("#grid").append(`<div class="col" id="col-${i}"></div>`)
    for(var n = 0; n < sequencer.vcoCount; n++){
      $(`#col-${i}`).append(`<div class="square" id="square-${(i*16)+n}"></div>`)

      $(`#square-${(i*16)+n}`).click(function(){
        var id = $(this).attr("id").match(/[0-9]+/)[0];
        sequencer.toggle(id);
        toggleMarked($(this));
      })
    }
  }
  placeMarkers();
}

function placeMarkers(){
  for(var i = 0; i < 16; i++){
    var rowData = sequencer.sequenceData.substr(i*16, 16);
    for(var n = 0; n < 16; n++){
      $(`#col-${i} #square-${(i*16)+n}`).removeClass("marked")
      if(rowData.charAt(n) === "1"){
        $(`#col-${i} #square-${(i*16)+n}`).addClass("marked")
      }
    }
  }
}

function highlightRow(colId, indeces){
  var prev;
  if(colId === 0){
    prev = 15;
  } else {
    prev = colId - 1;
  }
  for(var i = 0; i < 16; i++){
    $(`#col-${prev} #square-${(prev*16)+i}`).removeClass("active pressed");
    $(`#col-${colId} #square-${(colId*16)+i}`).addClass("active");
  }
  indeces.forEach(index => {
    $(`#col-${colId} #square-${(colId*16)+index}`).addClass("pressed")
  });
}

function getPattern(id){
  $.get(`http://localhost:3000/sequences/${id}`).done(sequence => {
    sequencer.sequenceTitle = sequence.title;
    sequencer.sequenceData = sequence.data;
    sequencer.sequenceId = sequence.id;
    placeMarkers();
  });
}

function placePreviewMarkers(sequence){
  for(var i = 0; i < 16; i++){
    var rowData = sequence.data.substr(i*16, 16);
    for(var n = 0; n < 16; n++){
      $(`#preview-${sequence.id} #p-col-${i} #p-square-${(i*16)+n}`).removeClass("p-marked")
      if(rowData.charAt(n) === "1"){
        $(`#preview-${sequence.id} #p-col-${i} #p-square-${(i*16)+n}`).addClass("p-marked")
      }
    }
  }
}

function generatePreview(sequence){
  $('#grids').append(`<div class="preview" id="preview-${sequence.id}"></div>`)
  $(`#preview-${sequence.id}`).css("background-color",`rgb(${Math.floor(Math.random()*(255+1))},${Math.floor(Math.random()*(255+1))},${Math.floor(Math.random()*(255+1))})`)
  for(var i = 0; i < sequencer.vcoCount; i++){
    $(`#preview-${sequence.id}`).append(`<div class="p-col" id="p-col-${i}"></div>`)
    for(var n = 0; n < sequencer.vcoCount; n++){
      $(`#preview-${sequence.id} #p-col-${i}`).append(`<div class="p-square" id="p-square-${(i*16)+n}"></div>`)
    }
  }
  $(`#preview-${sequence.id}`).click(function(){
    // console.log('GIMME DATA');
    // var id = $(this).attr('data-id');
    getPattern(sequence.id);
  })
  placePreviewMarkers(sequence);
}

// ----------------------------------------- UI
$(document).ready(function(){

  // var canvasContext = document.getElementById('oscilloscope').getContext('2d');

  function draw() {
    drawScope(sequencer.analyser, canvasContext);
    requestAnimationFrame(draw);
  }

  function drawScope(analyser, ctx) {
    var width = ctx.canvas.width;
    var height = ctx.canvas.height;
    var timeData = new Uint8Array(analyser.frequencyBinCount);
    var scaling = height / 256;
    var risingEdge = 0;
    var edgeThreshold = 0;

    analyser.getByteTimeDomainData(timeData);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.25';
    ctx.fillRect(0, 0, height, width);

    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.beginPath();

    // No buffer overrun protection
    while (timeData[risingEdge++] - 128 > 0 && risingEdge <= width);
    if (risingEdge >= width) risingEdge = 0;

    while (timeData[risingEdge++] - 128 < edgeThreshold && risingEdge <= width);
    if (risingEdge >= width) risingEdge = 0;

    for (var x = risingEdge; x < timeData.length && x - risingEdge < width; x++)
      ctx.lineTo(x - risingEdge, height - timeData[x] * scaling);

    ctx.stroke();
  }

  // draw();

  // request all sequences form API
  $.get("http://localhost:3000/sequences").done(sequences => {
    sequences.forEach(sequence => {
      generatePreview(sequence)
      $('#patterns').append(
        `<button class="pattern-button" data-id="${sequence.id}" >${sequence.title}</button>`
      );
    });
    $('.pattern-button').click(function(){
      console.log('dang');
      var id = $(this).attr('data-id');
      getPattern(id);
    });
  });

  generateGrid();
  // sequencer.oscillators.forEach((osc, index) => {
  //     $(".triggers").append(`<button class="button" id="${index}">${index+1}</button>`);
  // });

  $(".button").click(function(){
    var index = parseInt($(this).attr('id'), 10);
    sequencer.oscillators[index].trigger();

  });

  // master volume
  document.getElementById('master-volume').addEventListener('input', function() {
    sequencer.masterVolume.gain.value = this.value;
    $('#current-master-volume').text(this.value);
  });

  // filter
  document.getElementById('filter').addEventListener('input', function() {
    sequencer.filter.frequency.value = this.value;
    $('#current-filter-cutoff').text(this.value);
  });

  // filter resonance
  document.getElementById('reso').addEventListener('input', function() {
    sequencer.filter.Q.value = this.value;
    $('#current-filter-reso').text(this.value);
  });

  // filter type
  document.getElementById('filter-type').addEventListener('change', function() {
    sequencer.filter.type = $("input[name=filter]:checked").val();
  });

  // sequence speed
  document.getElementById('speed').addEventListener('input', function() {
    speed = this.value;
    $('#current-speed').text(this.value);
  });

  // attack
  // NOTE: why why why does to precision get funky?
  document.getElementById('attack').addEventListener('input', function() {
    attack = Number.parseFloat(this.value)
    $('#current-attack').text(this.value);
  });

  // release
  document.getElementById('release').addEventListener('input', function() {
    release = this.value;
    $('#current-release').text(this.value);
  });

  // lfo-vco-gain
  document.getElementById('lfo-gain').addEventListener('input', function() {
    sequencer.oscillators.forEach(oscillator => {
      oscillator.lfoGain.gain.value = this.value;
    });
    $('#current-lfo-gain').text(this.value);
  });

  // lfo-vco-frequency
  document.getElementById('lfo-frequency').addEventListener('input', function() {
    sequencer.oscillators.forEach(oscillator => {
      oscillator.lfo.frequency.value = this.value;
    });
    $('#current-lfo-frequency').text(this.value);
  });

  // lfo-filter-gain
  document.getElementById('lfo-filter-gain').addEventListener('input', function() {
    sequencer.lfoGain.gain.value = this.value;
    $('#current-lfo-filter-gain').text(this.value);
  });

  // lfo-filter-frequency
  document.getElementById('lfo-filter-frequency').addEventListener('input', function() {
    sequencer.lfo.frequency.value= this.value;
    $('#current-lfo-filter-frequency').text(this.value);
  });

  // vco coarse tune
  document.getElementById('tune-up').addEventListener('click', function() {
    $('#current-tuning').text(parseInt($('#current-tuning').text()) + 1);
    sequencer.oscillators.forEach(oscillator => {
      oscillator.vco.frequency.value += 100;
    });
    $('#current-lfo-frequency').text(this.value);
  });
  document.getElementById('tune-down').addEventListener('click', function() {
    $('#current-tuning').text(parseInt($('#current-tuning').text()) - 1);
    sequencer.oscillators.forEach(oscillator => {
      oscillator.vco.frequency.value -= 100;
    });
  });

  // vco fine tune
  document.getElementById('fine-tune').addEventListener('input', function() {
    sequencer.oscillators.forEach(oscillator => {
      oscillator.vco.detune.value = parseInt(this.value  * 10);
    });
    $('#current-fine-tune').text(this.value);
  });

  // vco waveshape
  document.getElementById('vco-waveshape').addEventListener('change', function() {
    sequencer.oscillators.forEach(oscillator => {
      oscillator.vco.type = $("input[name=waveshape]:checked").val();
    });
  });

  $('#start-sequencer').click(function(){
    sequencer.startSequencer()
  });

  $('#stop-sequencer').click(function(){
    sequencer.stopSequencer()
  });
});
