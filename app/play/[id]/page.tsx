import PlayShell from '../../../components/PlayShell';
import {QuizPlayer} from '../../../components/Play';
export const metadata={title:'À toi de jouer — TalentLink Play',referrer:'no-referrer' as const};
export default async function Page({params}:{params:Promise<{id:string}>}){return <PlayShell><QuizPlayer gameId={(await params).id}/></PlayShell>}
