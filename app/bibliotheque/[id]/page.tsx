import MentoringShell from '../../../components/MentoringShell';
import ResourceReader from '../../../components/ResourceReader';
export const metadata={title:'Ressource — TalentLink',robots:{index:false,follow:false},referrer:'no-referrer' as const};
export default async function Page({params}:{params:Promise<{id:string}>}){return <MentoringShell><ResourceReader id={(await params).id}/></MentoringShell>}
