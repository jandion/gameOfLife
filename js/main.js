if ( ! Detector.webgl ) Detector.addGetWebGLMessage();

var container;
var camera, scene, renderer, stats;
var plane;
var mouse, controls, raycaster;
var rollOverMesh, rollOverMaterial;
var pivotCenter = new THREE.Vector3(0, 0, 0);
var cubeGeo, cubeMaterial;
var objects = [];
var cells = [];
var gui;
var sRule = [2,3];
var bRule = [3];
init();
render();

function init() {
	//Add main div
	container = document.createElement( 'div' );
	document.body.appendChild( container );
	//Create camera and scene
	camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 1, 10000 );
	camera.position.set( 500, 800, 1300 );
	camera.lookAt( pivotCenter );
	scene = new THREE.Scene();
	
	//Add lights
	var light = new THREE.AmbientLight(0xffffff);
	scene.add(light);
	
	// cubes
	cubeGeo = new THREE.BoxGeometry( 50, 50, 50 );
	cubeMaterial = new THREE.MeshLambertMaterial( { color: 0x99ccff, ambient: 0x00ff80, shading: THREE.FlatShading, map: THREE.ImageUtils.loadTexture( "img/square-outline.png" ) } );
	cubeMaterial.ambient = cubeMaterial.color;
	//Create grid
	var size = 500, step = 50;
	var geometry = new THREE.Geometry();
	for ( var i = - size; i <= size; i += step ) {
		geometry.vertices.push( new THREE.Vector3( - size, 0, i ) );
		geometry.vertices.push( new THREE.Vector3(   size, 0, i ) );

		geometry.vertices.push( new THREE.Vector3( i, 0, - size ) );
		geometry.vertices.push( new THREE.Vector3( i, 0,   size ) );
	}

	var material = new THREE.LineBasicMaterial( { color: 0x000000, opacity: 0.2, transparent: true } );
	var line = new THREE.Line( geometry, material, THREE.LinePieces );
	scene.add( line );

	//Create renderer
	renderer = new THREE.WebGLRenderer( { antialias: true } );
	renderer.setClearColor( 0xf0f0f0 );
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	container.appendChild( renderer.domElement );
	
	// roll-over helpers
	rollOverGeo = new THREE.BoxGeometry( 50, 50, 50 );
	rollOverMaterial = new THREE.MeshBasicMaterial( { color: 0xff0000, opacity: 0.5, transparent: true } );
	rollOverMesh = new THREE.Mesh( rollOverGeo, rollOverMaterial );
	scene.add( rollOverMesh );
	
	//Add camera controls
	controls = new THREE.OrbitControls(camera);
	controls.addEventListener( 'change', render );

	//Cube drawing
	var geometry = new THREE.PlaneBufferGeometry( 1000, 1000 );
	geometry.applyMatrix( new THREE.Matrix4().makeRotationX( - Math.PI / 2 ) );
	plane = new THREE.Mesh( geometry );
	plane.visible = false;
	scene.add( plane );
	objects.push( plane );
	raycaster = new THREE.Raycaster();
	mouse = new THREE.Vector2();
	
	//GUI
	var gui = new dat.GUI();
	var text = {};
	text.Play = function() {
	var newCells = {};
	for( var cell in cells ) {
		var j=0;
		for(var i =-1; i<=1; i++){
			for(var k =-1; k<=1; k++){
				var x = cells[cell].position.x - 50*i;
				var y = cells[cell].position.y - 50*j;
				var z = cells[cell].position.z - 50*k;
				if(newCells[[x,y,z]]!==undefined) {
					newCells[[x,y,z]] = [newCells[[x,y,z]][0] || (i==0 && j==0 && k==0), newCells[[x,y,z]][1]+1];
				} else {
					newCells[[x,y,z]] = [i==0 && j==0 && k==0, 1];
				}
				if(i==0 && j==0 && k==0) newCells[[x,y,z]][1]--;
				//TODO: check boundaries
			}
		}
		//TODO: add 3D coordinates
		scene.remove(cells[cell]);
	}
	objects=[plane];
	cells = [];
	for( var cell in newCells ){
		if(newCells[cell][0]){
			//Survive rule
			if(sRule.indexOf(newCells[cell][1])>-1){
				var voxel = new THREE.Mesh( cubeGeo, cubeMaterial );
				var pos = cell.split(',');
				voxel.position.set(pos[0],pos[1],pos[2]);
				cells.push(voxel);
				scene.add( voxel );
			}
		} else {
			//Born rule
			if(bRule.indexOf(newCells[cell][1])>-1){
				var voxel = new THREE.Mesh( cubeGeo, cubeMaterial );
				var pos = cell.split(',');
				voxel.position.set(pos[0],pos[1],pos[2]);
				cells.push(voxel);
				scene.add( voxel );
			}
		}
	}
	};
	text.Speed = 1;
	text.Clear = false;
	text.Survive = '2';
	text.Born = '23';
	text.Expansion3D = false;
	text.Painting3D = false;
	var f1 = gui.addFolder('Controls')
	f1.add(text, 'Play');
	f1.add(text, 'Speed', 1, 5);
	f1.add(text, 'Clear');
	f1.open();
	var f2 = gui.addFolder('Rules');
	f2.add(text, 'Survive');
	f2.add(text, 'Born');
	var f3 = gui.addFolder('Settings');
	f3.add(text, 'Expansion3D');
	f3.add(text, 'Painting3D');
	
	
	document.addEventListener( 'mousedown', onDocumentMouseDown, false );
	document.addEventListener( 'mousemove', onDocumentMouseMove, false );
	window.addEventListener( 'resize', onWindowResize, false );
}

function onWindowResize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();

	renderer.setSize( window.innerWidth, window.innerHeight );
	render();
}
function onDocumentMouseMove( event ) {

	event.preventDefault();
	mouse.set( ( event.clientX / window.innerWidth ) * 2 - 1, - ( event.clientY / window.innerHeight ) * 2 + 1 );
	raycaster.setFromCamera( mouse, camera );
	var intersects = raycaster.intersectObjects( objects );
	if ( intersects.length > 0 ) {
		var intersect = intersects[ 0 ];
		rollOverMesh.position.copy( intersect.point ).add( intersect.face.normal );
		rollOverMesh.position.divideScalar( 50 ).floor().multiplyScalar( 50 ).addScalar( 25 );
	}
	render();

}
function onDocumentMouseDown( event ) {
	event.preventDefault();
	mouse.set( ( event.clientX / window.innerWidth ) * 2 - 1, - ( event.clientY / window.innerHeight ) * 2 + 1 );
	raycaster.setFromCamera( mouse, camera );
	var intersects = raycaster.intersectObjects( objects );
	if ( intersects.length > 0 ) {
		
		var intersect = intersects[ 0 ];
		if ( intersect.object != plane ) return;
			var voxel = new THREE.Mesh( cubeGeo, cubeMaterial );
			voxel.position.copy( intersect.point ).add( intersect.face.normal );
			voxel.position.divideScalar( 50 ).floor().multiplyScalar( 50 ).addScalar( 25 );
			scene.add( voxel );
			objects.push(voxel);
			cells.push(voxel);
		render();
	}
}

function render() {
	renderer.render( scene, camera );
}
