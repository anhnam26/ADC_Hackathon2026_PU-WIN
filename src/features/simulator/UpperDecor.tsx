// Wall-mounted artwork and ceiling details do not occupy the wheelchair route.
export default function UpperDecor(){
  return <group name="upper-floor-decoration">
    {[-8,-3,3,8].map((x,i)=><group key={x} position={[x,1.7,-19.89]}>
      <mesh><boxGeometry args={[1.7,1.1,.055]}/><meshStandardMaterial color="#384f4c"/></mesh>
      <mesh position={[0,0,.034]}><planeGeometry args={[1.58,.98]}/><meshStandardMaterial color={['#ead2aa','#b1cbd0','#c7d9b0','#e6bca9'][i]}/></mesh>
      <mesh position={[-.2,.08,.04]}><circleGeometry args={[.3,32]}/><meshStandardMaterial color={i%2?'#557978':'#a17052'}/></mesh>
      <mesh position={[.28,-.2,.046]} rotation={[0,0,.45]}><planeGeometry args={[.5,.5]}/><meshStandardMaterial color="#f8eddb"/></mesh>
    </group>)}
    {[-8,8].map(x=><group key={x} position={[x,2.75,-16]}>
      <mesh><cylinderGeometry args={[.38,.58,.18,24]}/><meshStandardMaterial color="#476b61"/></mesh>
      <mesh position={[0,-.1,0]} rotation={[Math.PI/2,0,0]}><circleGeometry args={[.52,24]}/><meshStandardMaterial color="#fff0d1" emissive="#fff0d1" emissiveIntensity={2} toneMapped={false}/></mesh>
      <mesh position={[0,.2,0]}><cylinderGeometry args={[.015,.015,.4,8]}/><meshStandardMaterial color="#52675e"/></mesh>
    </group>)}
  </group>;
}
