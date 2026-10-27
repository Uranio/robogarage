import { Link } from 'react-router-dom';

export default function Privacy() {
  return (
    <div style={{ paddingTop: 22, maxWidth: 700, lineHeight: 1.6 }}>
      <div className="dim"><span className="prompt">➜</span> ~ robogarage privacy</div>
      <h1>Privacy Policy — RoboGarage</h1>

      <p className="dim" style={{ fontSize: 13 }}><b>Last updated:</b> October 27, 2026</p>
      <p className="dim" style={{ fontSize: 13 }}><b>Project:</b> RoboGarage — free project by <b>Leonardo Martellini</b></p>

      <h2>1. Data Controller</h2>
      <p>RoboGarage is an open source project developed by <b>Leonardo Martellini</b>. The data controller is the operator of the RoboGarage instance you are using.</p>

      <h2>2. Data Collected</h2>
      <ul>
        <li><b>Registration data:</b> username, email (optional), password (hashed with scrypt, never stored in plaintext).</li>
        <li><b>Avatar:</b> optional profile image uploaded by the user (max 2 MB).</li>
        <li><b>Skills and repositories:</b> public or private content uploaded by the user (SKILL.md, AGENT.md, scripts, code).</li>
        <li><b>Access tokens (PAT):</b> hashed with scrypt; the plaintext value is never stored.</li>
        <li><b>Technical logs:</b> IP address, user-agent, timestamps (used only for security and rate limiting).</li>
      </ul>

      <h2>3. Purpose of Processing</h2>
      <ul>
        <li>Provide access to the RoboGarage platform (skills, agents, plugins).</li>
        <li>Allow import, publication, and validation of skills.</li>
        <li>Authenticate and authorize access to resources (public and private).</li>
        <li>Prevent abuse (rate limiting, brute force).</li>
      </ul>

      <h2>4. Legal Basis</h2>
      <p>Processing is based on <b>user consent</b> (Art. 6(1)(a) GDPR) and on the <b>performance of a contract</b> (Art. 6(1)(b) GDPR) for service provision.</p>

      <h2>5. Data Retention</h2>
      <p>Data is kept for as long as necessary to provide the service. You may request deletion of your account and associated data at any time.</p>

      <h2>6. User Rights</h2>
      <p>You have the right to access, rectify, erase, restrict processing, data portability, and object. You may exercise these rights by contacting the controller at the address indicated in the RoboGarage instance you are using.</p>

      <h2>7. Data Transfers</h2>
      <p>Data remains within the infrastructure where the RoboGarage instance is hosted. It is not transferred to third countries without adequate safeguards.</p>

      <h2>8. Cookies and Tracking</h2>
      <p>RoboGarage does not use profiling cookies. Only technical session cookies may be used (JWT stored locally in the browser).</p>

      <h2>9. Changes to this Policy</h2>
      <p>This privacy policy may be updated. Changes are published on this page with the last updated date.</p>

      <h2>10. Contacts</h2>
      <p>For privacy requests: contact the administrator of the RoboGarage instance you are using.</p>

      <hr style={{ margin: '30px 0', border: 'none', borderTop: '1px solid var(--line)' }} />
      <p className="dim" style={{ fontSize: 12 }}>
        © 2026 Leonardo Martellini. All rights reserved. RoboGarage is distributed under the MIT license.
      </p>
    </div>
  );
}
