function hxlProxyToJSON(input,headers){
    var output = [];
    var keys=[]
    input.forEach(function(e,i){
        if(i==0){
            e.forEach(function(e2,i2){
                var parts = e2.split('+');
                var key = parts[0]
                if(parts.length>1){
                    var atts = parts.splice(1,parts.length);
                    atts.sort();                    
                    atts.forEach(function(att){
                        key +='+'+att
                    });
                }
                keys.push(key);
            });
        } else {
            var row = {};
            e.forEach(function(e2,i2){
                row[keys[i2]] = e2;
            });
            output.push(row);
        }
    });
    return output;
}

function graph(id,cf,dimension,filter,percap,xmin,xmax,ymax){

    cf.countryDim.filterAll();
    cf.regionDim.filterAll();

    cf[dimension].filter(filter);

    var data  = cf.epiWeekGroup.all();

    var margin = {top: 20, right: 20, bottom: 25, left: 55},
        width = $(id).width() - margin.left - margin.right,
        height = 100 - margin.top - margin.bottom;

	var x = d3.scale.linear().range([0, width]);
	var y = d3.scale.linear().range([height, 0]);

	var line = d3.svg.line()
            .x(function(d,i) { return x(d['key']); })
            .y(function(d) { return y(d['value']); })
            .interpolate("basis");

	x.domain([xmin,xmax]);
    if(ymax==false){
        ymax = d3.max(data, function(d) { return d['value']; });
    }
  	y.domain([0,ymax]);

    var xAxis = d3.svg.axis()
        .scale(x)
        .orient("bottom")
        .ticks(5);

    var yAxis = d3.svg.axis()
        .scale(y)
        .orient("left")
        .ticks(3);

  	var svg = d3.select(id)
	    .append('svg')
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    svg.append('path')
	    .datum(data)
	    .attr('class', 'sparkline')
	    .attr('d', line)
	    .attr('stroke','#B71C1C')
	    .attr('stroke-width',3)
        .attr('fill','none');

    svg.append("g")
        .attr("class", "xaxis axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis);

    svg.append("g")
        .attr("class", "yaxis axis")
        .call(yAxis);        
}

function update(cf,ynorm,selected){
    console.log(selected);
    cf.countryDim.filterAll();
    cf.regionDim.filterAll();
    cf.severityDim.filter(function(d){
      return selected.indexOf(d) > -1;
    });        
   
        if(ynorm){
            ynorm = d3.max(cf.epiWeekCountryGroup.all(),function(d){
                return d['value'];
            });
        }
        $('#graphs').html('');
        var countries = cf.countryGroup.all();
        countries.forEach(function(c,i){
                $('#graphs').append('<div id="graph'+i+'" class="col-md-4"><h4>'+c['key']+'</h4></div>');
                graph('#graph'+i,cf,'countryDim',c['key'],false,xmin,xmax,ynorm);
        });
 
}

var xmin;
var xmax;

$.ajax({
		type:'GET',
		url: 'https://proxy.hxlstandard.org/data.json?strip-headers=on&url=https%3A//docs.google.com/spreadsheets/d/1_S6PA5L32Mq7H_cfp9NAe-Y8-17hNer2OMyb3hVPTvU/pub%3Fgid%3D1516521608%26single%3Dtrue%26output%3Dcsv', 
    	    dataType: 'json',		
      	    success: function(data) {
        		data = hxlProxyToJSON(data);
        		data.forEach(function(d){
        			  d['#date+epiweek+outbreak'] = +d['#date+epiweek+outbreak']
                });

                xmin = d3.min(data,function(d){return d['#date+epiweek+outbreak']});
                xmax = d3.max(data,function(d){return d['#date+epiweek+outbreak']}); 

                cf = crossfilter(data);
                cf.countryDim = cf.dimension(function(d){return d['#country']});
                cf.regionDim = cf.dimension(function(d){return d['#region']});
                cf.severityDim = cf.dimension(function(d){return d['#severity']});
                cf.epiWeekDim = cf.dimension(function(d){return d['#date+epiweek+outbreak']});
                cf.epiWeekCountryDim = cf.dimension(function(d){return d['#date+epiweek+outbreak']+'#'+d['#country']});
                cf.epiWeekGroup = cf.epiWeekDim.group().reduceSum(function(d){return d['#affected']});
                cf.countryGroup = cf.countryDim.group();
                cf.epiWeekCountryGroup = cf.epiWeekCountryDim.group().reduceSum(function(d){return d['#affected']});
                update(cf,false,['Confirmed','Suspected']);            
      	    }
        });

function selectChange(){
    var selected = [];
        $('.cases:checked').each(function() {
            selected.push($(this).attr('value'));
        });
        if ($('#ind').is(':checked')) {
            update(cf,false,selected); 
        }
        else {
            update(cf,true,selected); 
        }
}

$('input[type=radio][name=yaxis]').change(function() {
    selectChange();
});
$('.cases').change(function(){
    selectChange();
})

