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

function createHash(data){
    var output = {}
    data.forEach(function(d){
        output[d['#country+code']] = {country:d['#country+name'],pop:d['#population']}
    });
    return output
}

function graph(id,cf,dimension,filter,percap,xmin,xmax,ymax,pop){

    cf.countryDim.filterAll();
    cf.regionDim.filterAll();
    cf.epiWeekDim.filterAll();

    cf[dimension].filter(filter);

    var data  = cf.epiWeekGroup.all();
    var population=popData[filter].pop;

    if(pop){
        var line = d3.svg.line()
                .x(function(d,i) { return x(d['key']); })
                .y(function(d) { return y(d['value']/population*100000); })
                .interpolate("basis");
        if(ymax==false){
            ymax = d3.max(data, function(d) { return d['value']/population*100000; });
        }                        
    } else {
        var line = d3.svg.line()
                .x(function(d,i) { return x(d['key']); })
                .y(function(d) { return y(d['value']); })
                .interpolate("basis");

        if(ymax==false){
            ymax = d3.max(data, function(d) { return d['value']; });
        }                        
    }

    var margin = {top: 20, right: 20, bottom: 25, left: 55},
        width = $(id).width() - margin.left - margin.right,
        height = 100 - margin.top - margin.bottom;

	var x = d3.scale.linear().range([0, width]);
	var y = d3.scale.linear().range([height, 0]);

	x.domain([xmin,xmax]);

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

function update(cf,ynorm,selected,sort,pop){
    cf.countryDim.filterAll();
    cf.regionDim.filterAll();
    cf.epiWeekDim.filter(xmax);
    cf.severityDim.filter(function(d){
      return selected.indexOf(d) > -1;
    });
    if(pop){
        if(ynorm){
            ynorm = d3.max(cf.epiWeekCountryGroup.all(),function(d){
                return +d['value']/popData[d['key'].split('#')[1]].pop*100000;
            });
        }
    } else {        
        if(ynorm){
            ynorm = d3.max(cf.epiWeekCountryGroup.all(),function(d){
                return d['value'];
            });
        }
    }
        $('#graphs').html('');
        var countries = jQuery.extend([], cf.countryGroup.all());
        if(sort){
            countries.sort(function(a,b){
                if(pop){
                    return parseFloat(b.value/popData[b.key].pop) - parseFloat(a.value/popData[a.key].pop);
                } else {
                    return parseFloat(b.value) - parseFloat(a.value);
                }
            });
        } else {
            countries.sort(function(a,b){
                return a.key.localeCompare(b.key);
            }); 
        }
        var country ='';
        countries.forEach(function(c,i){
                country = popData[c['key']].country;
                $('#graphs').append('<div id="graph'+i+'" class="col-md-4"><h4>'+country+'</h4></div>');
                graph('#graph'+i,cf,'countryDim',c['key'],false,xmin,xmax,ynorm,pop);
        });
 
}
    

var xmin;
var xmax;
var cf;
var pop = false;
var popData;
var sort = false;

var dataCall = $.ajax({ 
    type: 'GET', 
    url: 'https://proxy.hxlstandard.org/data.json?force=1&strip-headers=on&url=https%3A//docs.google.com/spreadsheets/d/1_S6PA5L32Mq7H_cfp9NAe-Y8-17hNer2OMyb3hVPTvU/pub%3Fgid%3D1516521608%26single%3Dtrue%26output%3Dcsv&filter01=clean&clean-whitespace-tags01=%23severity%2C%23geo%2Biso3', 
    dataType: 'json',
});

var popCall = $.ajax({ 
    type: 'GET', 
    url: 'https://proxy.hxlstandard.org/data.json?url=https%3A//docs.google.com/spreadsheets/d/1kyxNHb1w_X1CapmuLWxX5g-65_2KaQmk5rxgSkCAtsw/edit%23gid%3D0&strip-headers=on&filter01=cut&cut-include-tags01=%23country%2C%23population', 
    dataType: 'json',
});

$.when(dataCall,popCall).then(function(dataArgs,popArgs){
        data = hxlProxyToJSON(dataArgs[0]);
        data.forEach(function(d){
            d['#date+epiweek+outbreak'] = +d['#date+epiweek+outbreak']
        });
        popData = createHash(hxlProxyToJSON(popArgs[0]));

        xmin = d3.min(data,function(d){return d['#date+epiweek+outbreak']});
        xmax = d3.max(data,function(d){return d['#date+epiweek+outbreak']}); 

        cf = crossfilter(data);
        cf.countryDim = cf.dimension(function(d){return d['#geo+iso3']});
        cf.regionDim = cf.dimension(function(d){return d['#region']});
        cf.severityDim = cf.dimension(function(d){return d['#severity']});
        cf.epiWeekDim = cf.dimension(function(d){return d['#date+epiweek+outbreak']});
        cf.epiWeekCountryDim = cf.dimension(function(d){return d['#date+epiweek+outbreak']+'#'+d['#geo+iso3']});
        cf.epiWeekGroup = cf.epiWeekDim.group().reduceSum(function(d){return d['#affected']});
        cf.countryGroup = cf.countryDim.group().reduceSum(function(d){return d['#affected']});
        cf.epiWeekCountryGroup = cf.epiWeekCountryDim.group().reduceSum(function(d){return d['#affected']});

        update(cf,false,['Confirmed','Suspected'],false,false);
    });

function selectChange(){
    var selected = [];
        $('.cases:checked').each(function() {
            selected.push($(this).attr('value'));
        });
        if ($('#ind').is(':checked')) {
            update(cf,false,selected,sort,pop); 
        }
        else {
            update(cf,true,selected,sort,pop); 
        }
}

$('input[type=radio][name=yaxis]').change(function() {
    selectChange();
});
$('.cases').change(function(){
    selectChange();
})

$('input[type=radio][name=abs]').change(function() {
    pop =!pop;
    selectChange();
});

$('#sort').on('click',function(){
    if(sort){
        $('#sort').html('Sort by highest');
    } else {
        $('#sort').html('Sort by A-Z');
    }
    sort = !sort;
    selectChange();
});
