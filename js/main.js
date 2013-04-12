///////////////////////////////////////////////////
// Authors: Andrea Siviero (VMware) and Massimo Re Ferre' (VMware)
// We have used / leveraged the following libraries:
// vCloud JavaScript SDK (included in Silverlining): 
// JQueryMobile framework: 
// VivaGraph library:
//////////////////////////////////////////////////

resize();

$(document).ready(function(){  

///////////////////////////////////////////////////
// Here we initialize the variables, set the sliders
// to on and we open the login panel (to make it more
// more obvious you have to login first
///////////////////////////////////////////////////

var IP=null;
var Org=null;
var User=null;
var Pass=null;
var cloudUrl=null;
var cloud=null;
var layout="network";
var allNetworks = [];
var allOrgVdcs = [];
var catalogs = [];
$('#vm2net').val('on').slider('refresh');
$('#net2edge').val('on').slider('refresh');
$('#vapp2vm').val('off').slider('refresh');
$('#login').panel( "open" );

///////////////////////////////////////////////////
// Here we check the status of the relations to  
// draw (vm to net, edge to net, vapp to edge).
// If the state change we re-draw the entire picture 
// calling the setup(UI) function 
///////////////////////////////////////////////////

$('#vm2net').bind( "change", function(event, ui) {
setupUI();
});
$('#net2edge').bind( "change", function(event, ui) {
setupUI();
});
$('#vapp2vm').bind( "change", function(event, ui) {
setupUI();
});

///////////////////////////////////////////////////
// Here we check whether the network layout or 
// the catalog layout is selected (radio button).
// If the net is selected we enable all sliders (as
// they pertain to the network layout). If the catalog 
// is selected we disable them.
// We always call the setup(UI) function every time
///////////////////////////////////////////////////

$('#network').change(function() {
	if (this.checked) {
		layout = "network";
		$('#vm2net').slider('enable');
		$('#net2edge').slider('enable');
		$('#vapp2vm').slider('enable');
		setupUI();
		}
	});
$('#catalog').change(function() {
	if (this.checked) {
		layout = "catalog";
		$('#vm2net').slider('disable');
		$('#net2edge').slider('disable');
		$('#vapp2vm').slider('disable');
		setupUI();
		}
	});

///////////////////////////////////////////////////
/// Setup VivaGraph Libraries
///////////////////////////////////////////////////

var graph = Viva.Graph.graph();

///////////////////////////////////////////////////
// Visualization Custom functions and Nodesize 
// used for images
///////////////////////////////////////////////////

var graphics = Viva.Graph.View.svgGraphics(),
    nodeSize = 24;

graphics.node(function(node) {

///////////////////////////////////////////////////
// Normalize the type of object
///////////////////////////////////////////////////

var type = 'network';
var name = node.id;
if (node.data) {
  	var str = node.data.type;
	//  console.log(str, str.indexOf('vm+xml'), str.indexOf('vapp+xml'),str.indexOf('gateway') );
	if (str.indexOf('vm+xml') >= 0) {type = 'vm';}
    if (str.indexOf('vApp+xml') >= 0) {type = 'vapp';} 
    if (str.indexOf('gateway') >= 0) {type = 'gateway';} 
    if (str.indexOf('ext') >= 0) {type = 'extnet';}        
    if (str.indexOf('catalog') >= 0) {type = 'catalog';}        
    name = node.data.name;
    }



var ui = Viva.Graph.svg('g'),


///////////////////////////////////////////////////
//Create SVG text element with name as title and <type>.png as Image
///////////////////////////////////////////////////

svgText = Viva.Graph.svg('title').text(name),
      
      img = Viva.Graph.svg('image')
         .attr('width', nodeSize)
         .attr('height', nodeSize)
         .link('img/' + type +'.png');
  var circle = Viva.Graph.svg('circle')
                    .attr('r', (nodeSize+8)/2)
                    .attr('stroke', 'none')
                    .attr('stroke-width', '1.5px')
                    .attr("fill", 'none')
                    .attr("cx",nodeSize/2)
                    .attr("cy",nodeSize/2);
  
  ui.append(svgText);
  ui.append(img);
  ui.append(circle);



///////////////////////////////////////////////////
//We stop the propagation of the click on the object 
//By default a click of a child object propagates  
///////////////////////////////////////////////////

  $(ui).click(function(event) {
  event.stopPropagation();
  
///////////////////////////////////////////////////
//We take the content of an object and push it into the "details" of the HTML code
//We populate the <details> div with the content of the "html" variable
//filled by the buildhtml() function
///////////////////////////////////////////////////
  var html = buildhtml (node);
  $('#details').html(html);  
  if ($('#details').is(':hidden')) {
    $('#details').show("slow");
    }
  });


///////////////////////////////////////////////////
//If we click on the background we hide the details window
///////////////////////////////////////////////////
$('#global').click(function() {
  $('#details').hide("slow");
});


///////////////////////////////////////////////////
// We center the image
///////////////////////////////////////////////////


  return ui;
}).placeNode(function(nodeUI, pos) {
    // 'g' element doesn't have convenient (x,y) attributes, instead
    // we have to deal with transforms: http://www.w3.org/TR/SVG/coords.html#SVGGlobalTransformAttribute 
    nodeUI.attr('transform', 'translate(' + (pos.x - nodeSize/2) + ',' + (pos.y - nodeSize/2) + ')');
    });

var vivalayout = Viva.Graph.Layout.forceDirected(graph, {
    dragCoeff : 0.05
    });

var renderer = Viva.Graph.View.renderer(graph, {
   container : document.getElementById('visualization'),
   graphics : graphics,
   layout: vivalayout
});
 
renderer.run(); 

///////////////////////////////////////////////////
// On Click create a Connection to the Cloud
// We populate the variables and then call setupCloud()
///////////////////////////////////////////////////

$('#Connect').click(function(){
	IP=$('#IP').val();
	Org=$('#Org').val();
	if (Org == "system") {alert("The tool doesn't support logging into the cloud as root. Please login into a regular Org"); return};
	User=$('#User').val();
	Pass=$('#Pass').val();
	cloudUrl = 'https://'+IP+'/api/';
	console.log(cloudUrl+" Org: "+Org+" User: "+User+" Pass: "+Pass);
	setupCloud();
	$.mobile.loading( 'show');
	}); //End On Click Login


///////////////////////////////////////////////////
// Here we define the setupCloud() function
// We populate the variables and then call setupCloud()
///////////////////////////////////////////////////

var setupCloud = function() {
    cloud = new vmware.cloud(cloudUrl, vmware.cloudVersion.V5_1);
    
    cloud.register(vmware.events.cloud.LOGIN, onLogin);
    
    cloud.register(vmware.events.cloud.ERROR, function(obj) {
    	msg = "Please check you are connecting to a cloud with signed certificates. Also make sure you start your browser with security disabled (e.g. open /Applications/Google\\ Chrome.app --args --disable-web-security)"
        console.log(msg);
        console.log(obj.eventData + msg);
        $.mobile.loading( 'hide');
        alert(obj.eventData + msg); 
        });

    cloud.once(vmware.events.cloud.INITIALIZATION_COMPLETE, function() { 
        console.log('SDK ready');//
        cloud.login(User,Pass,Org);        
//        cloud.confirmLoggedIn();
        });

    cloud.once(vmware.events.cloud.REFRESH_COMPLETE, function() { 
        console.log('Refresh Complete');
        
///////////////////////////////////////////////////        
// We had to set a fictious 5 seconds timeout before drawing the graphs to ensure 
// all API queries have completed. Since Javascript runs all these stuff in parallel we
// either had to do this or create a more elegant event based serialization. This was
// quicker and easier for the purpose of this exercise
///////////////////////////////////////////////////
       
        setTimeout(function() {
    		  $.mobile.loading( 'hide');
    	      setupUI(); 
            }, 5000);
    	}); // End of cloud.once()
    	    
}; // End of setupCloud()


///////////////////////////////////////////////////
//This function builds dynamically the html code to view the details of the node/object
///////////////////////////////////////////////////

function buildhtml (node){
	var html = '<table><tr><th>Keys</th><th>Values</th></tr>';
var attributes = node.data.detail.attr;     
    for (keys in attributes) {
//      console.log(keys,attributes[keys]);    
	  html += '<tr><td><b>' + keys + '</b></td><td><i>' + attributes[keys] +'</i></td></tr>';
	}
    html += '</table>';
return html;
}


///////////////////////////////////////////////////
// We launch the search function for the text being typed
///////////////////////////////////////////////////


$("input#find").keyup( function (e) {
var searchString = $("input#find").val();
console.log('searching for: ',searchString);
searchNode(searchString);
});


///////////////////////////////////////////////////
// This is the searchNode function
///////////////////////////////////////////////////

function searchNode(searchString){
    graph.forEachNode(function(node){
      if (node.data){
          var strname = node.data.name;
          var circle = node.ui.getElementsByTagName('circle')[0]; //get the circle element of SVG Structure
          var strsearchterm = "";
          circle.attr('stroke','none'); // clear the Circle Selection
          if (node.data.detail.attr.hasOwnProperty('searchTerm')) strsearchterm = node.data.detail.attr.searchTerm;
//          console.log(strname,strsearchterm);
          var re = new RegExp(searchString,'i');
          var matchname = strname.match(re);
          var matchsearchterm = strsearchterm.match(re);
//          console.log(strname,strsearchterm,re,matchname, matchsearchterm);
          if (((matchname)||(matchsearchterm))&&(searchString!="")) {
//              console.dir(circle); 
              circle.attr('stroke','#ff0000');
   
          }
      }
    });

}


///////////////////////////////////////////////////
// This is being called after a successful login that does the discover of the networks,
// Org VDCs and related relations
///////////////////////////////////////////////////

function onLogin (e) {
allNetworks = [];
allOrgVdcs = [];

    if (e.eventData.success) {
        if (!e.eventData.confirm) {
            console.log('Logged into '+ cloud.getUserOrg() +' as '+ cloud.getUserName());
            learnNetworks("orgVdcNetwork", "OrgVdcNetworkRecord", allNetworks);
            learnOrgVdcs("orgVdc","OrgVdcRecord", allOrgVdcs);
          }
            else {
            console.log('Session still exists'); 
            }
        // continue with authenticated session... 
    }
        else {
            if (e.eventData.confirm) {
                console.log('Session expired');
            // continue as if user is not authenticated... 
            }
            else {
                console.log('Invalid credentials');
                alert("Invalid credentials");
                } 
         }
}

///////////////////////////////////////////////////
// The setupUI actually builds the graphical representation of the relations
///////////////////////////////////////////////////

function setupUI() {

graph.clear();
var vapps = cloud.getVApps(cloud.SORTBY.DATE), 
        vapp = {},
        vms = [],
        vm = {},
        network = {},
        gateway = {},
        OrgVdc ={};       

var networkID ='';
var gatewayID ='';
        
var catalogs = cloud.getCatalog();

// console.dir(layout);

console.dir("starting setupUI");

console.log(layout);

///////////////////////////////////////////////////
// Depending on  the context/layout chosen in the UI we enter different branches 
///////////////////////////////////////////////////


///////////////////////////////////////////////////
// This is the catalog branch 
///////////////////////////////////////////////////

if (layout == 'catalog') {
 
console.dir(catalogs);

for (var e=0; e<catalogs.length; e++) {
	catalog= catalogs[e] 
	//console.dir(catalog);
	console.dir(catalog.attr.catalog);
	if (!graph.getNode(catalog.attr.catalog)) {
		graph.addNode(catalog.attr.catalog, {"name":catalog.attr.catalog, "type":'catalog', "detail":catalog});
		console.log(graph.getNode(catalog.attr.catalog) + " creato");
	}	
	if (!graph.getNode(catalog.attr.name)) {
		graph.addNode(catalog.attr.name, {"name":catalog.attr.name, "type":'vApp+xml', "detail":{"attr":{"name":catalog.attr.name, "type": "vapp"}}});
		console.log(graph.getNode(catalog.attr.vapp) + " creato");
	}
	graph.addLink(catalog.attr.catalog, catalog.attr.name);    
	
}; // end FOR to build catalogs

} // end IF (layout = catalog)


///////////////////////////////////////////////////
// This is the network branch 
///////////////////////////////////////////////////


if (layout == 'network') {




///////////////////////////////////////////////////
// We take into account the net-to-edge relation in the drawing
///////////////////////////////////////////////////

if ($('#net2edge').val() == "on") {
    for (var e=0; e<allOrgVdcs.length; e++) { 
    OrgVdc = allOrgVdcs[e];
    console.log("Name: "+OrgVdc.getName());
        for (var g=0; g<OrgVdc.edgeGateways.length; g++) { 
            gateway = OrgVdc.edgeGateways[g];
            gatewayID = OrgVdc.getName()+gateway.getName()+'[edge]'; // href shoud be the ID, BUT Network objects returned by API has ONLY conntectedTo (String) property 
            console.log("Name gw: "+gatewayID); // avoiding duplicate gateways name using ovDC prefix
            if (!graph.getNode(gatewayID)) graph.addNode(gatewayID,{"name":gateway.getName(), "type":'gateway',"detail":gateway, "isPinned":true});
            console.dir(gateway.Uplinks);
            for (var u=0; u<gateway.Uplinks.length; u++)
            {
              var name = gateway.Uplinks[u].attr.name;
              var id = name+'[extnet]';
              console.log(id, graph.getNode(id));
              if (!graph.getNode(id)) 
   				 { 
    		      graph.addNode(id,{"name":name, "type":'extnet',"detail":{"attr":{"name":name,"type":"extnet"}}, "isPinned":false});
    			 }
              graph.addLink(gatewayID,id);              
             } 
        }
    }
} //net2edge

///////////////////////////////////////////////////
// We take into account the VM-to-net relation in the drawing
///////////////////////////////////////////////////

if (($('#net2edge').val() == "on") || ($('#vm2net').val() == "on")) {
    for (var k=0; k<allNetworks.length; k++) { 
        network = allNetworks[k];
        networkID = network.getName(); // TODO better unique ID should be used, BUT Network objects returned by JDK API has no method implemented 
        gatewayID = network.getvdcName()+network.getConnectedTo()+'[edge]';
        console.log("Name: "+networkID+" Connected to:"+network.getConnectedTo());
        graph.addNode(networkID,{"name":network.getName(), "type":'network',"detail":network,}); 
        if (network.getConnectedTo() && ($('#net2edge').val() == "on"))  {
            if (!graph.getNode(gatewayID)) 
                { // if is not connected to an Edge than is connected to External Network
                          var name = network.getConnectedTo();
                          var id = name+'[extnet]';

                          if (!graph.getNode(id) ) 
                            { 
                              graph.addNode(id,{"name":name, "type":'extnet',"detail":{"attr":{"name":name,"type":"extnet"}}, "isPinned":true});
                             }
    
                graph.addLink(networkID,id); // connect Network to the "connectedTo" Network
                } else
                    {
                     graph.addLink(networkID,gatewayID); // connect Network to the "connectedTo" EDGE
                    }
            } // if net2edge AND connected to EDGE or ExtNet
            
     } // for All Networks

} // if net2edge or vm2net


///////////////////////////////////////////////////
// We take into account the VM-to-vApp relation in the drawing
///////////////////////////////////////////////////

for (var i=0; i<vapps.length; i++) { 
     vapp = vapps[i];
     console.info(' vApp '+ vapp.getName() +' object...');
     console.dir(vapp);
     vms = vapp.getChildren();
    if ($('#vapp2vm').val() == "on") graph.addNode(vapp.attr.id, {"name":vapp.attr.name, "type":vapp.attr.type, "detail":vapp});
     for (var j=0; j<vms.length; j++) {
         vm = vms[j];
//         console.info(' VM '+ vm.getName() +' object...'); 
//         console.dir(vm);
         if ($('#vapp2vm').val() == "on") {
                graph.addNode(vm.attr.id, {"name":vm.attr.name, "type":vm.attr.type, "detail":vm});
                graph.addLink(vapp.attr.id,vm.attr.id);
                }

         if ($('#vm2net').val() == "on") {
             if ($('#vapp2vm').val() == "off") graph.addNode(vm.attr.id, {"name":vm.attr.name, "type":vm.attr.type, "detail":vm});
              if (!graph.getNode(vm.getNetwork())) {
                  // if the network connectedTo the VM is None will add details 
                  graph.addNode(vm.getNetwork(),{"name":"none", "type":'network',"detail":{"attr":{"name":"none","type":"network"}}, "isPinned":false});
                  }
              graph.addLink(vm.attr.id,vm.getNetwork());
         }
     }  // for VMs
 } // for vApps


}; // end IF (layout = network)

} // end setupUI()

///////////////////////////////////////////////////
// End of the setupUI function
///////////////////////////////////////////////////




////////////////////////////////////////////////////
// derived from learnAbstract in the SDK
///////////////////////////////////////////////////

///////////////////////////////////////////////////
// Querying vCD networks and parsing the output to get the list of the networks array and their properties
///////////////////////////////////////////////////

var learnNetworks = function(queryterm, returnterm, array) {
        cloud.fetchURL(cloudUrl.concat("query?type=" + queryterm + "&format=records"), "GET", null, parseNetworks(returnterm, array));
    };

// ParseAbstract
var parseNetworks = function(retterm, array) {
        return function(xmlDoc) {
            var networks = xmlDoc.getElementsByTagName(retterm);
                var network;
                for (var i = 0; i < networks.length; i++) {
                    network = new Networks();
                    console.dir(network);
                    for (var j = 0; j < networks[i].attributes.length; j++) {
                        network.setAttr(shorten(networks[i].attributes[j].name), networks[i].attributes[j].value);
                        network.setAttr("searchTerm", network.getAttr("searchTerm") + shorten(networks[i].attributes[j].name) + ":" + networks[i].attributes[j].value);
                    }
                array[i] = network;
                }
        };
    };



///////////////////////////////////////////////////
// Querying vCD OrgvDCs and parsing the output to get the list of the Org vDCs array and their properties
// In addition for each Org vDC we fetch the Gateway
// Per each Gateway retrieved we parse it to retrieve the Uplink 
// Per each Uplink we retrieve the types and properties of the networks
///////////////////////////////////////////////////

var learnOrgVdcs = function(queryterm, returnterm, array) {
        cloud.fetchURL(cloudUrl.concat("query?type=" + queryterm + "&format=records"), "GET", null, parseOrgVdc(returnterm, array));
    };

var parseOrgVdc = function(retterm, array) {
        return function(xmlDoc) {
            var TAGOrgVdcs = xmlDoc.getElementsByTagName(retterm);
                var OrgVdc;
                for (var i = 0; i < TAGOrgVdcs.length; i++) {
                    OrgVdc = new OrgVdcs();
                    console.dir(OrgVdc);
                    for (var j = 0; j < TAGOrgVdcs[i].attributes.length; j++) {
                        OrgVdc.setAttr(shorten(TAGOrgVdcs[i].attributes[j].name), TAGOrgVdcs[i].attributes[j].value);
                        OrgVdc.setAttr("searchTerm", OrgVdc.getAttr("searchTerm") + shorten(TAGOrgVdcs[i].attributes[j].name) + ":" + TAGOrgVdcs[i].attributes[j].value);
                    }
                array[i] = OrgVdc;
                var str = OrgVdc.getHref();
                vdcId = str.split("/")[str.split("/").length - 1];
                cloud.fetchURL(cloudUrl.concat("admin/vdc/"+vdcId+"/edgeGateways"), "GET", null, parseEdgeGateways("EdgeGatewayRecord",OrgVdc.edgeGateways));
                }
        };
    }; // end parseOrgvDC
    

var parseEdgeGateways = function(retterm, array) {
        return function(xmlDoc) {
            var gateways = xmlDoc.getElementsByTagName(retterm);
                var gateway;
                for (var i = 0; i < gateways.length; i++) {
                    gateway = new Gateways();
                    console.dir(gateway);
                    for (var j = 0; j < gateways[i].attributes.length; j++) {
                        gateway.setAttr(shorten(gateways[i].attributes[j].name), gateways[i].attributes[j].value);
                        gateway.setAttr("searchTerm", gateway.getAttr("searchTerm") + shorten(gateways[i].attributes[j].name) + ":" + gateways[i].attributes[j].value);
                    }
                array[i] = gateway;
                var str = gateway.getHref();
                cloud.fetchURL(str, "GET", null, parseUplinkGateways("GatewayInterface",array[i].Uplinks));

                }
        };
    }; // End of parseEdgeGateways



var parseUplinkGateways = function(retterm, array) {
        return function(xmlDoc) {
            var gatewayInterfaces = xmlDoc.getElementsByTagName(retterm);
                var gatewayInterface;
                for (var i = 0; i < gatewayInterfaces.length; i++) {
                    Uplink = new Uplinks();
                    var textcontent = gatewayInterfaces[i].textContent; 
//                    console.log(textcontent);
                    
                    if (textcontent.match(/uplink/i)) {
                      Uplink.setAttr('name',gatewayInterfaces[i].childNodes[1].childNodes[0].data);
                      Uplink.setAttr('interfacetype','uplink');
//                      console.dir(Uplink);
                      array.push(Uplink);
                    }
                }
        };
    }; // end of parseUplinkGateways
    
    
///////////////////////////////////////////////////
// Here we define the function Networks()
///////////////////////////////////////////////////

function Networks() {

    this.attr = {
        "searchTerm": ""
    };
    this.xml = "";

    this.setAttr = function(a, b) {
        this.attr[a] = b;
    };

    this.getAttr = function(key) {
        return this.attr[key];
    };

    this.save = function() {
        return {
            attr: this.attr
        };
    };
    this.load = function(loadObj) {
        this.attr = loadObj.attr || this.attr;
    };

    this.getHref = function() {
        return this.getAttr('href');
    }
    this.getName = function() {
        return this.getAttr('name');
    }
    this.getLinkType = function() {
        return this.getAttr('linkType');
    }

    this.getvdcName = function() {
        return this.getAttr('vdcName');
    }
    this.getvdc = function() {
        return this.getAttr('vdc');
    }
    this.getNetmask = function() {
        return this.getAttr('netmask');
    }
    this.getlinkType = function() {
        return this.getAttr('linkType');
    }
    this.getConnectedTo = function() {
        return this.getAttr('connectedTo');
    }
    this.getDns1 = function() {
        return this.getAttr('dns1');
    }
    this.getDns2 = function() {
        return this.getAttr('dns2');
    }
    this.getDnsSuffix = function() {
        return this.getAttr('dnsSuffix');
    }

    this.getDefaultGateway = function() {
        return this.getAttr('defaultGateway');
    }
};        



///////////////////////////////////////////////////
// Here we define the function OrgVdcs()
///////////////////////////////////////////////////

function OrgVdcs() {

    this.edgeGateways = [];
    
    this.attr = {
        "searchTerm": ""
    };
    this.xml = "";

    this.setAttr = function(a, b) {
        this.attr[a] = b;
    };

    this.getAttr = function(key) {
        return this.attr[key];
    };

    this.save = function() {
        return {
            attr: this.attr
        };
    };
    this.load = function(loadObj) {
        this.attr = loadObj.attr || this.attr;
    };

    this.getHref = function() {
        return this.getAttr('href');
    }
    this.getName = function() {
        return this.getAttr('name');
    }
};        

///////////////////////////////////////////////////
// We define the function Gateways()
///////////////////////////////////////////////////

function Gateways() {
    
    this.attr = {
        "searchTerm": ""
    };
    
    this.Uplinks = [];
    
    this.xml = "";

    this.setAttr = function(a, b) {
        this.attr[a] = b;
    };

    this.getAttr = function(key) {
        return this.attr[key];
    };

    this.save = function() {
        return {
            attr: this.attr
        };
    };
    this.load = function(loadObj) {
        this.attr = loadObj.attr || this.attr;
    };

    this.getHref = function() {
        return this.getAttr('href');
    }
    this.getName = function() {
        return this.getAttr('name');
    }
};        


///////////////////////////////////////////////////
// Here we define the function Uplinks()
///////////////////////////////////////////////////

function Uplinks() {
    
    this.attr = {
        "searchTerm": ""
    };
    this.xml = "";

    this.setAttr = function(a, b) {
        this.attr[a] = b;
    };

    this.getAttr = function(key) {
        return this.attr[key];
    };

    this.save = function() {
        return {
            attr: this.attr
        };
    };
    this.load = function(loadObj) {
        this.attr = loadObj.attr || this.attr;
    };

    this.getName = function() {
        return this.getAttr('name');
    }
};        



/*
* Internal: Checks if given string can be shortened/converted to
* human-readable. Returns the new or the old if no new can be found.
*/
var shorten = function(str) {
return (shortened[str] ? shortened[str] : str);
	};
var shortened = {
"ownerName": "owner",
"memoryAllocationMB": "memory",
"catalogName": "catalog",
"storageKB": "storage",
"cpuAllocationMhz": "cpu"
};


}); //End-Document-Ready



///////////////////////////////////////////////////
// This function resizes the elements in the page so
// that they adapt dynamically when the browser resizes
///////////////////////////////////////////////////

$(window).resize(function(){
resize();
})

function resize(){
    console.log("Windows resized");
  setTimeout(function(){
    var height = $(window).height();
    var width  = $(window).width();
    console.log('width: '+width+'height: '+height);
    height = height - 100 -($('.ui-header').height()+$('.ui-footer').height());
    width = width -30;
    $('#visualization').height(height);
    $('#visualization').width(width);
    },500);
}
