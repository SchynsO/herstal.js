/**
 * Class to render the world based on the HERSTALshared world
 * @param {HERSTALshared.World} world - the world to render
 * @param {THREE.Camera} camera - the camera from where to render the world, can be null
 */
function WorldRender (world, camera){
	this.world  = world;
	this.camera = camera;

	this.scene = new THREE.Scene();

	this.characterModels = [];
}
WorldRender.prototype.constructor = HERSTALclient.WorldRender = WorldRender;

WorldRender.prototype.addCharacterModel = function( characterModel ){
	// since we are in a web browser, we can use the method addElement defined in HERSTALshared
	this.characterModels.addElement(characterModel);
	// the characterModel shoudl in which world it is
	characterModel.worldRender = this;
	// we add the model itself to the scene
	this.scene.add(characterModel.mesh);
};

WorldRender.prototype.removeCharacterModel = function( characterModel ){
	var index = this.characterModels.removeElement( characterModel );
	// if the character was in the array
	if(index > -1){
		characterModel.worldRender = null;
		this.scene.remove(characterModel.mesh);
	}
};
