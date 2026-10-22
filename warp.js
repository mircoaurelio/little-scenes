(function(root){
  'use strict';
  const identity=Object.freeze([[0,0],[1,0],[1,1],[0,1]].map(Object.freeze));
  function isValid(q){
    if(!Array.isArray(q)||q.length!==4||q.some(p=>!Array.isArray(p)||p.length!==2||p.some(n=>!Number.isFinite(n)||n<0||n>1)))return false;
    let area=0;
    for(let i=0;i<4;i++){
      const a=q[i],b=q[(i+1)%4],c=q[(i+2)%4];
      if((b[0]-a[0])*(c[1]-b[1])-(b[1]-a[1])*(c[0]-b[0])<1e-5)return false;
      area+=a[0]*b[1]-b[0]*a[1];
    }
    return area>.04;
  }
  const normalize=q=>(isValid(q)?q:identity).map(p=>[...p]);
  function coefficients(quad){
    const [p0,p1,p2,p3]=normalize(quad);
    const dx1=p1[0]-p2[0],dx2=p3[0]-p2[0],dx3=p0[0]-p1[0]+p2[0]-p3[0];
    const dy1=p1[1]-p2[1],dy2=p3[1]-p2[1],dy3=p0[1]-p1[1]+p2[1]-p3[1];
    let g=0,h=0;
    if(Math.abs(dx3)+Math.abs(dy3)>1e-12){
      const determinant=dx1*dy2-dx2*dy1;
      g=(dx3*dy2-dx2*dy3)/determinant;h=(dx1*dy3-dx3*dy1)/determinant;
    }
    return [p1[0]-p0[0]+g*p1[0],p3[0]-p0[0]+h*p3[0],p0[0],p1[1]-p0[1]+g*p1[1],p3[1]-p0[1]+h*p3[1],p0[1],g,h];
  }
  function mapPoint(q,[u,v]){
    const [a,b,c,d,e,f,g,h]=coefficients(q),denominator=g*u+h*v+1;
    return [(a*u+b*v+c)/denominator,(d*u+e*v+f)/denominator];
  }
  function cssMatrix(q,width,height){
    const w=Math.max(1,width),h=Math.max(1,height),[a,b,c,d,e,f,g,k]=coefficients(q);
    return 'matrix3d('+[a,d*h/w,0,g/w,b*w/h,e,0,k/h,0,0,1,0,c*w,f*h,0,1].join(',')+')';
  }
  const isIdentity=q=>normalize(q).every((p,i)=>p.every((n,j)=>Math.abs(n-identity[i][j])<1e-8));
  root.ProjectionWarp={identity,isValid,normalize,mapPoint,cssMatrix,isIdentity};
})(globalThis);
