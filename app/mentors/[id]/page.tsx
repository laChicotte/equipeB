import MentoringShell from '../../../components/MentoringShell';
import {MentorDirectory} from '../../../components/Mentoring';
export const metadata={title:'Profil mentor — TalentLink'};
export default async function Page({params}:{params:Promise<{id:string}>}){return <MentoringShell><MentorDirectory profileId={(await params).id}/></MentoringShell>}
