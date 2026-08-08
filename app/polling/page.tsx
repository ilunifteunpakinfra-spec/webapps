import Link from 'next/link';
import { BarChart3, Plus, CheckCircle2 } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/supabase/user';
import VoteButton from './VoteButton';

export const metadata = {
  title: 'Polling - ILUNI FT ELEKTRO UNPAK',
};

type PollRow = {
  id: string;
  judul: string;
  deskripsi: string | null;
  created_by: string;
  expired_at: string | null;
  created_at: string | null;
};

type OptionRow = { id: string; poll_id: string; teks_opsi: string };
type VoteRow = { poll_id: string; option_id: string; alumni_id: string };

export default async function PollingPage() {
  const supabase = await createClient();
  const user = await getCurrentUser();

  const { data: pollRows } = await supabase
    .from('polls')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20);

  const polls = (pollRows ?? []) as PollRow[];
  const pollIds = polls.map((poll) => poll.id);

  const [{ data: optionRows }, { data: voteRows }] = await Promise.all([
    pollIds.length
      ? supabase.from('poll_options').select('id, poll_id, teks_opsi').in('poll_id', pollIds)
      : { data: [] as OptionRow[] },
    pollIds.length
      ? supabase.from('poll_votes').select('poll_id, option_id, alumni_id').in('poll_id', pollIds)
      : { data: [] as VoteRow[] },
  ]);

  const options = (optionRows ?? []) as OptionRow[];
  const votes = (voteRows ?? []) as VoteRow[];

  const optionsByPoll = new Map<string, OptionRow[]>();
  for (const option of options) {
    const list = optionsByPoll.get(option.poll_id) ?? [];
    list.push(option);
    optionsByPoll.set(option.poll_id, list);
  }

  const votesByOption = new Map<string, number>();
  for (const vote of votes) {
    votesByOption.set(vote.option_id, (votesByOption.get(vote.option_id) ?? 0) + 1);
  }

  const userVotedPolls = new Set(
    user ? votes.filter((vote) => vote.alumni_id === user.id).map((vote) => vote.poll_id) : []
  );

  const now = Date.now();

  function expiresLabel(iso: string | null): string {
    if (!iso) return 'Tanpa batas';
    const diff = new Date(iso).getTime() - now;
    if (diff <= 0) return 'Berakhir';
    const days = Math.ceil(diff / 86_400_000);
    if (days === 1) return '1 hari lagi';
    return `${days} hari lagi`;
  }

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />

      <div className="mx-auto max-w-[1280px] px-5 py-8 md:px-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="hero-title mb-2">Polling</h1>
            <p className="text-on-surface-variant">
              Suarakan pendapat Anda untuk keputusan komunitas
            </p>
          </div>
          <Link href="/polling/baru" className="btn-primary">
            <Plus className="h-4 w-4" />
            Buat Polling
          </Link>
        </div>

        {polls.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {polls.map((poll) => {
              const pollOptions = optionsByPoll.get(poll.id) ?? [];
              const totalVotes = pollOptions.reduce(
                (sum, option) => sum + (votesByOption.get(option.id) ?? 0),
                0
              );
              const isExpired = poll.expired_at ? new Date(poll.expired_at).getTime() <= now : false;
              const hasVoted = userVotedPolls.has(poll.id);
              const canVote = Boolean(user) && !hasVoted && !isExpired;

              return (
                <div key={poll.id} className="card">
                  <div className="mb-3 flex items-start justify-between">
                    <div>
                      <h3 className="font-montserrat font-bold text-on-surface">{poll.judul}</h3>
                      {poll.deskripsi && (
                        <p className="mt-1 text-sm text-on-surface-variant">{poll.deskripsi}</p>
                      )}
                    </div>
                    <BarChart3 className="h-5 w-5 shrink-0 text-primary-container" />
                  </div>

                  {hasVoted && (
                    <div className="mb-3 flex items-center gap-1 text-xs text-primary-container">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Anda sudah memberikan suara
                    </div>
                  )}

                  <div className="space-y-2">
                    {pollOptions.map((option) => {
                      const optionVotes = votesByOption.get(option.id) ?? 0;
                      const pct = totalVotes > 0 ? Math.round((optionVotes / totalVotes) * 100) : 0;
                      const isChosen = hasVoted && votes.some(
                        (vote) => vote.poll_id === poll.id && vote.option_id === option.id && vote.alumni_id === user?.id
                      );

                      return canVote ? (
                        <VoteButton
                          key={option.id}
                          pollId={poll.id}
                          optionId={option.id}
                          label={option.teks_opsi}
                        />
                      ) : (
                        <button
                          key={option.id}
                          type="button"
                          disabled
                          className={`w-full rounded border p-3 text-left transition-colors ${
                            isChosen
                              ? 'border-primary-container bg-primary-container/10'
                              : 'border-wire-gray bg-white'
                          }`}
                        >
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">{option.teks_opsi}</span>
                            <span className="font-mono text-xs text-on-surface-variant">
                              {pct}%
                            </span>
                          </div>
                          <div className="mt-2 h-1.5 w-full overflow-hidden rounded bg-surface-container">
                            <div
                              className="h-full bg-primary-container"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-outline-variant pt-3 text-sm text-on-surface-variant">
                    <span>{totalVotes} suara</span>
                    <span className="chip">{expiresLabel(poll.expired_at)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="card text-center text-on-surface-variant">
            Belum ada polling. Buat polling pertama untuk komunitas!
          </div>
        )}
      </div>
    </div>
  );
}
