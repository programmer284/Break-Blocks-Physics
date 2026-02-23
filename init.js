//1px ^= 1mm -> 1000px ^= 1m


const canv = document.getElementById('canvas');
const ctx = canv.getContext('2d');
//physical constants
const PH_CONSTANTS={
	e:1.6e-19, //elemental electrical charge, Coulomb
	epsilon_0:8.854e-12, //electric field constant, (A*s)/(V*m)
	my_0:1.2566e-6, //magnetic field constant, (V*s)/(A*m)
	h:6.626e-34, //planck quantum, J*s
}
//
var objects = [];


const keyEvents = [];
for(let i=0; i<256; i++){
	keyEvents.push(false);
}

function toBool(expr){if(expr){return true;}else{return false;}};
function distance(x1,y1,x2,y2){return ((x2-x1)**2+(y2-y1)**2)**0.5};
function getAngle(vectorX,vectorY){ //angle in radians
	if(vectorX<0){
		if(vectorY==0){
			return Math.PI
		}else{
			return Math.sign(vectorY)*Math.PI+Math.atan(vectorY/vectorX)
		}
	}else if(vectorX==0){
		return Math.PI*Math.sign(vectorY)/2
	}else{
		return Math.atan(vectorY/vectorX)
	}
}

document.addEventListener('keydown',(event)=>{keyEvents[event.keyCode]=true});
document.addEventListener('keyup',(event)=>{keyEvents[event.keyCode]=false});

//classes
function Comp(args){
	this.type=args?.type ?? 'rect'
	this.width=args?.width ?? 10;
	this.height=args?.height ?? 10;
	this.midX=args?.x ?? 0;
	this.midY=args?.y ?? 0;
	this.rad=args?.rad ?? 10;
	this.color=args?.color ?? '#000000';
	this.angle=args?.angle ?? 0; //radians
	this.tiltAngle=args?.tiltAngle ?? 0; //radians, style angle
	
	//physics
	this.physics={
		v:{x:0,y:0,getAbs:function(){return (this.x**2+this.y**2)**0.5}}, //velocity in px/10ms
		a:{x:0,y:0,getAbs:function(){return (this.x**2+this.y**2)**0.5}}, //acceleration in px/(10ms)^2 - Do NOT write directly to a -- instead apply forces after F=m*a
		m:1, //mass
		forces:{}, //force in kg*px/(10ms)^2
		applyForce:function(name,xComp,yComp){
			this.forces[name ?? 'F'+Object.keys(this.forces).length]={x:parseFloat(xComp) || 0, y:parseFloat(yComp) || 0}
		},
		deleteForce:function(name){
			this.applyForce(name,0,0)
		},
		deleteAllForce:function(){
			Object.keys(this.forces).forEach((force)=>{this.deleteForce(force)})
		},
		q:0, //electric charge
		}
	//
	
	//img
	if(this.type=='img'){
		this.img=new Image();
		this.source=args?.source ?? '';
		this.img.src=this.source;
		this.img.onload=function(){
			this.width=args.width ?? this.img.width;
			this.height=args.height ?? this.img.height;
		};
	}
	//
	//text
	if(this.type=='text'){
		this.content=args?.content ?? '';
		this.font=args?.font ?? '11px Arial'; // format: 'bold italic size family' - ex. 'bold italic 11px Arial'
		this.textBaseline=args?.textBaseline ?? 'middle'; // top, hanging, middle, alphabetic, ideographic, bottom
		this.textAlign=args?.textAlign ?? 'center'; // left, right, center, start, end
	}
	//
	this.visible=args?.visible ?? true;
	objects.push(this);
	this.getObjType=function(){
		return this.type
	};
	this.refresh=function(){
		if(this.visible && this.type=='rect'){
			ctx.save();
			ctx.translate(this.midX,this.midY);
			ctx.rotate(this.angle+this.tiltAngle);
			ctx.fillStyle=this.color;
			ctx.fillRect(-this.width/2, -this.height/2, this.width, this.height);
			ctx.restore();
		};
		if(this.visible && this.type=='circ'){
			ctx.fillStyle=this.color;
			ctx.strokeStyle=this.color;
			ctx.beginPath();
			ctx.arc(this.midX, this.midY, this.rad, 0, 2*Math.PI);
			ctx.fill();
			ctx.stroke();
			ctx.closePath();
		};
		if(this.visible && this.type=='img'){	
			ctx.save();
			ctx.translate(this.midX,this.midY);
			ctx.rotate(this.angle+this.tiltAngle);
			ctx.drawImage(this.img,-this.width/2,-this.height/2,this.width,this.height);
			ctx.restore();
		};
		if(this.visible && this.type=='text'){
			ctx.save();
			ctx.translate(this.midX,this.midY);
			ctx.rotate(this.angle+this.tiltAngle);
			ctx.fillStyle=this.color;
			ctx.font=this.font;
			ctx.textBaseline=this.textBaseline;
			ctx.textAlign=this.textAlign;
			ctx.fillText(this.content,0,0);
			ctx.restore();
		};
	};
	this.del=function(){
		try{
		objects.splice(objects.indexOf(this),1)
		}catch(e){console.log('could not delete object')}
	};
	this.touches=function(other){
		if(other.getObjType() == 'rect' || other.getObjType() == 'img'){
			if(this.midX+this.width/2 < other.midX-other.width/2 || 
			this.midX-this.width/2 > other.midX+other.width/2 || 
			this.midY+this.height/2 < other.midY-other.height/2 || 
			this.midY-this.height/2 > other.midY+other.height/2){
				return false;
			}else{
				return true;
			}
		}
		if(other.getObjType() == 'circ'){
			if(distance(this.midX,this.midY,other.midX,other.midY) > (this.rad+other.rad)){
				return false;
			}else{
				return true;
			}
		}
	};
	this.touchesEdge=function(edge){
		if(this.type=='rect' || this.type=='img'){
			if(edge == 'top' && this.midY-this.height/2 <= 0){
				return true;
			};
			if(edge == 'bottom' && this.midY+this.height/2 >= canv.height){
				return true;
			};
			if(edge == 'left' && this.midX-this.width/2 <= 0){
				return true;
			};
			if(edge == 'right' && this.midX+this.width/2 >= canv.width){
				return true;
			};
		}
		if(this.type=='circ'){
			if(edge == 'top' && this.midY+this.radius <= 0){
				return true;
			};
			if(edge == 'bottom' && this.midY+this.radius >= canv.height){
				return true;
			};
			if(edge == 'left' && this.midX+this.radius <= 0){
				return true;
			};
			if(edge == 'right' && this.midX+this.radius >= canv.width){
				return true;
			};
		}
		return false;
	};
	this.moveHor=function(dx){
		this.midX+=dx;
	};
	this.moveVer=function(dy){
		this.midY+=dy
	};
	this.moveDir=function(d){
		this.midX+=d*Math.cos(this.angle);
		this.midY+=d*Math.sin(this.angle);
	}
}

Comp.prototype.getArguments=function(){return ['type','width','height','x','y','rad','color','angle','tiltAngle','source','visible','content','font','textBaseline','textAlign']};
Comp.prototype.getTypes=function(){return ['img','circ','rect','text']};

//

//update
let lastTime;
function updateCanv(ts){
	if(ts-(lastTime ?? 0) >=10 ){
		lastTime=ts
		ctx.clearRect(0,0,canv.width,canv.height);
		objects.forEach((el)=>{
			el.physics.a.x=Object.values(el.physics.forces).length ? (Object.values(el.physics.forces).map((e)=>e.x).reduce((e,f)=>e+f))/el.physics.m : 0
			el.physics.a.y=Object.values(el.physics.forces).length ? (Object.values(el.physics.forces).map((e)=>e.y).reduce((e,f)=>e+f))/el.physics.m : 0
			el.physics.v.x+=el?.physics?.a?.x ?? 0
			el.physics.v.y+=el?.physics?.a?.y ?? 0
			el?.moveHor(el?.physics?.v?.x ?? 0)
			el?.moveVer(el?.physics?.v?.y ?? 0)
		});
		objects.forEach((el)=>{try{el?.refresh()}catch(e){}});
	}
	requestAnimationFrame(updateCanv)
}
requestAnimationFrame(updateCanv)
//


