import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import DancingRobot from '../components/DancingRobot';
import { api } from '../lib/api';
import { useSession } from '../lib/session';

export default function Landing() {
  const me = useSession();
  const [stats, setStats] = useState({ skills: 0, users: 0, stars: 0 });

  useEffect(() => {
    api.stats().then((s: any) => {
      setStats({ skills: s.repos || 0, users: s.users || 0, stars: s.stars || 0 });
    }).catch(() => {});
  }, []);

  return (
    <div style={{ textAlign: 'center', paddingTop: 30, paddingBottom: 30 }}>
      <div className="dim"><span className="prompt">$</span> ./robogarage --service</div>
      <h1 style={{ fontSize: 32, margin: '10px 0' }}>Every robot needs a garage<span className="blink grn">▊</span></h1>
      <div className="dim">Skills, agents & plugins — serviced, validated, ready to dance.</div>

      <div style={{ marginTop: 22 }}>
        <DancingRobot />
      </div>

      <div className="row" style={{ justifyContent: 'center', marginTop: 20 }}>
        {me ? (
          <Link to="/new"><button className="amber">+ Create your skill</button></Link>
        ) : (
            <Link to="/register"><button className="amber">Get started →</button></Link>
        )}
        <Link to="/skills"><button className="ghost">Explore skills</button></Link>
      </div>

      <div className="dim" style={{ marginTop: 16, fontSize: 12 }}>
        {stats.skills} skills · {stats.users} members · ★ {stats.stars}
      </div>
    </div>
  );
}
