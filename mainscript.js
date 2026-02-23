'use strict'

var magField=new Comp({type:'img',x:canv.width/2,y:canv.height/2,width:canv.width,height:canv.height,source:'./assets/images/magnetic-field-downwards.png',visible:false})
var grid=new Comp({x:canv.width/2,y:500,width:canv.width,height:2,color:'#aaaaaa',visible:false})
var detector1=new Comp({x:canv.width/2,y:350,width:canv.width,height:2,color:'#ffd700',visible:false})
var detector2=new Comp({x:canv.width/2,y:550,width:canv.width,height:2,color:'#ffd700',visible:false})
var plateLeft=new Comp({x:0,y:canv.height/2,width:4,height:canv.height,color:'#ff0000'})
var plateRight=new Comp({x:canv.width,y:canv.height/2,width:4,height:canv.height,color:'#0000ff'})
var blocks=[]
var player=new Comp({x:canv.width/2,y:700,width:200,height:25})
var ball=new Comp({x:canv.width/2,y:680,width:20,height:20,color:'#00ff00'})

//custom values
ball.physics.m=10
var voltage=10000
var brakeType=1
var pushForce=15
var brakeForce=10
var magFieldDensity=0
var gridConstant=100 // *1e-39
var gapWidth=100 // *1e-38
//
var isGame=false
let int1;
let int2;

function getElCollisionVs(obj1,obj2){
	return {
		v1:{
			x:((obj1.physics.m-obj2.physics.m)*obj1.physics.v.x+2*obj2.physics.m*obj2.physics.v.x)/(obj1.physics.m+obj2.physics.m),
			y:((obj1.physics.m-obj2.physics.m)*obj1.physics.v.y+2*obj2.physics.m*obj2.physics.v.y)/(obj1.physics.m+obj2.physics.m)
		},
		v2:{
			x:((obj2.physics.m-obj1.physics.m)*obj2.physics.v.x+2*obj1.physics.m*obj1.physics.v.x)/(obj1.physics.m+obj2.physics.m),
			y:((obj2.physics.m-obj1.physics.m)*obj2.physics.v.y+2*obj1.physics.m*obj1.physics.v.y)/(obj1.physics.m+obj2.physics.m)
		}
	}
}

function getUnElCollisionVs(obj1,obj2){
	return {
		v:{
			x:(obj1.physics.v.x*obj1.physics.m+obj2.physics.v.x*obj2.physics.m)/(obj1.physics.m+obj2.physics.m),
			y:(obj1.physics.v.y*obj1.physics.m+obj2.physics.v.y*obj2.physics.m)/(obj1.physics.m+obj2.physics.m)
		}
	}
}

for(let i=0;i<20;i++){
	for(let j=0;j<60;j++){
		blocks.push(new Comp({x:60+15*j,y:50+15*i,width:10,height:10}))
	}
}

function updGame(){
	for(let e of blocks){ //hitting block
		if(e.touches(ball)){
			let velocities=getElCollisionVs(ball,e)
			ball.visible=true
			ball.physics.v.x=velocities.v1.x
			ball.physics.v.y=velocities.v1.y
			e.physics.v.x=velocities.v2.x
			e.physics.v.y=velocities.v2.y
			if(document.getElementById('dischargeOnBlocks').checked)ball.physics.q=0
		}
	}
	if((ball.touchesEdge('right')&&(ball.physics.v.x>0))||(ball.touchesEdge('left')&&(ball.physics.v.x<0))){ball.physics.v.x=-ball.physics.v.x} //hitting side edge
	if(ball.touchesEdge('top')){ball.physics.v.y=Math.abs(ball.physics.v.y)} //hitting top edge
	if(ball.touchesEdge('right') && voltage){ //charging
		ball.physics.q=(-1e17)*PH_CONSTANTS.e
	}else if(ball.touchesEdge('left') && voltage){
		ball.physics.q=(1e17)*PH_CONSTANTS.e
	}
	switch(Math.sign(ball.physics.q)){ //color for charge
		case 1:
			ball.color='#ff0000' //positive
			break;
		case -1:
			ball.color='#0000ff' //negative
			break;
		default:
			ball.color='#00ff00' //neutral
			break;
	}
	ball.physics.applyForce('F_G',0,0.3*ball.physics.m) //gravity force
	ball.physics.applyForce('F_el',ball.physics.q*(voltage/canv.width),0) //electric force
	ball.physics.applyForce('F_L',-ball.physics.q*ball.physics.v.y*magFieldDensity,ball.physics.q*ball.physics.v.x*magFieldDensity) //Lorentz force
	if(ball.touches(grid) && ball.visible && grid.visible && ball.physics.v.y<0){ //interference
		ball.visible=false
		let wavelen=PH_CONSTANTS.h/(ball.physics.m*ball.physics.v.getAbs()) //de broglie wavelength
		let intensity=function(angle){ //degrees
			let beta=Math.PI*gridConstant*(1e-39)*angle/wavelen
			let gamma=Math.PI*gapWidth*(1e-38)*angle/wavelen
			return Math.cos(gamma)**2*(Math.sin(beta)/beta)**2
		}
		let randSum=Math.random()*(Object.keys([...Array(179)]).map((e)=>(parseInt(e)-89==0 ? 1 : intensity(parseInt(e)-89))).reduce((e,f)=>e+f));
		let newAngle=-89
		while(randSum-intensity(newAngle)>0){
			randSum-=intensity(newAngle)
			newAngle++
		}
		let ballAngle=Math.round(getAngle(-ball.physics.v.y,ball.physics.v.x)*180/Math.PI)
		newAngle=ballAngle+newAngle
		if(newAngle<=-90 || newAngle>=90){newAngle=Math.sign(newAngle)*89}
		newAngle*=Math.PI/180
		/*
		let arr=[]
		for(let i=0;i<178;i++){
			arr.push(Math.floor(Math.random()*2))
		}
		let newAngle=(arr.filter((n)=>n).length-89)*Math.PI/180
		*/
		let absV=ball.physics.v.getAbs()
		ball.physics.v.y=-Math.cos(newAngle)*absV
		ball.physics.v.x=Math.sin(newAngle)*absV
	}
	if(ball.touches(detector1) && detector1.visible){ //detector
		ball.visible=true;
	}
	if(ball.touches(detector2) && detector2.visible){ //detector
		ball.visible=true;
	}
	if(ball.touches(player)){ //hitting platform
		ball.visible=true;
		if(document.getElementById('dischargeOnPlatform').checked)ball.physics.q=0
	}
	if(ball.touches(player)&&ball.physics.v.y>0){ //hitting platform
		ball.physics.v.y=-ball.physics.v.y
		if(ball.physics.v.y<100){
			ball.physics.v.y-=4
		}
		ball.physics.v.x+=0.4*player.physics.v.x
	}
	blocks.forEach((e)=>{
		if(e.touchesEdge('top')||e.touchesEdge('bottom')||e.touchesEdge('left')||e.touchesEdge('right')){
			e.del()
			blocks.splice(blocks.indexOf(e),1)
		}
	})
	if(blocks.length==0){ //win
		document.getElementById('endMessage').innerHTML='You Won!'
		document.getElementById('endMessage').style.color='#00ff00'
		objects.forEach((e)=>{
			e.physics.v.x=0
			e.physics.v.y=0
			e.physics.deleteAllForce()
		})
		clearInterval(int1)
		clearInterval(int2)
		isGame=false
		return
	}
	if(ball.touchesEdge('bottom')){ //lose
		ball.visible=true
		document.getElementById('endMessage').innerHTML='You Lost!'
		document.getElementById('endMessage').style.color='#ff0000'
		objects.forEach((e)=>{
			e.physics.v.x=0
			e.physics.v.y=0
			e.physics.deleteAllForce()
		})
		clearInterval(int1)
		clearInterval(int2)
		isGame=false
		return
	}
	if(isGame){
		setTimeout(updGame,10) //recursive
	}else{
		objects.forEach((e)=>{
			e.physics.v.x=0
			e.physics.v.y=0
			e.physics.deleteAllForce()
		})
	}
}

function KEventListener(){
	if((keyEvents.at(65)||keyEvents.at(37))&& !(player.touchesEdge('left'))){
		player.physics.applyForce('push',-pushForce*0.1,0)
	}else if((keyEvents.at(68)||keyEvents.at(39))&& !(player.touchesEdge('right'))){
		player.physics.applyForce('push',pushForce*0.1,0)
	}else{
		player.physics.deleteForce('push')
	}
	if(keyEvents.at(83)||keyEvents.at(40)){
		if(brakeType){
			player.physics.applyForce('brake',-(player.physics.v.x)*brakeForce*0.01,0)
		}else{
			player.physics.applyForce('brake',-Math.sign(player.physics.v.x)*brakeForce*0.01,0)
		}
	}else{
		player.physics.deleteForce('brake')
	}
}

function updPlayer(){
	if((player.touchesEdge('right')&&(player.physics.v.x>0))||(player.touchesEdge('left')&&(player.physics.v.x<0))){player.physics.v.x=-player.physics.v.x}
}
document.getElementById('pushForceInp').addEventListener('change',function(){pushForce=parseInt(this.value)||5})
document.getElementById('brakeForceInp').addEventListener('change',function(){brakeForce=parseInt(this.value)||10})
document.getElementById('brakeType').addEventListener('change',function(){brakeType=parseInt(this.dataset.selected)})
document.getElementById('ballMassInp').addEventListener('change',function(){ball.physics.m=parseInt(this.value)||10})
document.getElementById('voltageInp').addEventListener('change',function(){voltage=!(isNaN(parseInt(this.value))) ? parseInt(this.value) : 10000})
document.getElementById('magFieldDensityInp').addEventListener('change',function(){
	magFieldDensity=!(isNaN(parseInt(this.value))) ? parseInt(this.value) : 0
	if(magFieldDensity<0){
		magField.visible=true
		magField.img.src='./assets/images/magnetic-field-downwards.png'
	}else if(magFieldDensity>0){
		magField.visible=true
		magField.img.src='./assets/images/magnetic-field-upwards.png'
	}else{
		magField.visible=false
	}
})
document.getElementById('detector1PosInp').addEventListener('change',function(){
	detector1.midY=350+(!isNaN(parseInt(this.value)) ? parseInt(this.value) : 0)
})
document.getElementById('gridConstantInp').addEventListener('change',function(){gridConstant=parseInt(this.value)||100})
document.getElementById('gapWidthInp').addEventListener('change',function(){gapWidth=parseInt(this.value)||100})
document.getElementById('isGrid').addEventListener('change',function(){
	grid.visible=this.checked
	detector1.visible=this.checked && document.getElementById('isDetector1').checked
	detector2.visible=this.checked && document.getElementById('isDetector2').checked
	document.getElementById('isDetector1').disabled=!this.checked
	document.getElementById('isDetector2').disabled=!this.checked
})
document.getElementById('isDetector1').addEventListener('change',function(){
	detector1.visible=this.checked && document.getElementById('isDetector1').checked
})
document.getElementById('isDetector2').addEventListener('change',function(){
	detector2.visible=this.checked && document.getElementById('isDetector2').checked
})
document.getElementById('startGame').addEventListener('click',()=>{
	if(!isGame){
		document.getElementById('endMessage').innerHTML='&nbsp;'
		isGame=true
		ball.midX=canv.width/2
		ball.midY=680
		switch(document.getElementById('starterCharge').dataset.selected){
			case '0':
				ball.physics.q=voltage ? (-1e17)*PH_CONSTANTS.e : 0
				break;
			case '2':
				ball.physics.q=voltage ? (1e17)*PH_CONSTANTS.e : 0
				break;
			case '3':
				ball.physics.q=voltage ? (Math.floor(Math.random()*3)-1)*(1e17)*PH_CONSTANTS.e : 0
				break;
			default:
				ball.physics.q=0
				break;
		}
		ball.color='#00ff00'
		player.midX=canv.width/2
		player.midY=700
		int1=setInterval(KEventListener,10)
		int2=setInterval(updPlayer,10)
		for(let e of blocks){
			e.del()
		}
		blocks=[]
		for(let i=0;i<20;i++){
			for(let j=0;j<60;j++){
				blocks.push(new Comp({x:60+15*j,y:50+15*i,width:10,height:10}))
			}
		}
		setTimeout(()=>{
			ball.physics.v.x=Math.floor(Math.random()*20)-10
			ball.physics.v.y=-14
			updGame()
		},1000)
	}
})

document.getElementById('endGame').addEventListener('click',()=>{
	if(isGame){
		document.getElementById('endMessage').innerHTML='Game ended.'
		document.getElementById('endMessage').style.color='#000000'
		objects.forEach((e)=>{
			e.physics.v.x=0
			e.physics.v.y=0
			e.physics.deleteAllForce()
		})
		clearInterval(int1)
		clearInterval(int2)
		isGame=false
	}
})
document.getElementById('leftBtn').addEventListener('pointerdown',()=>{
	keyEvents[37]=true
})
document.getElementById('leftBtn').addEventListener('pointerup',()=>{
	keyEvents[37]=false
})
document.getElementById('downBtn').addEventListener('pointerdown',()=>{
	keyEvents[40]=true
})
document.getElementById('downBtn').addEventListener('pointerup',()=>{
	keyEvents[40]=false
})
document.getElementById('rightBtn').addEventListener('pointerdown',()=>{
	keyEvents[39]=true
})
document.getElementById('rightBtn').addEventListener('pointerup',()=>{
	keyEvents[39]=false
})




