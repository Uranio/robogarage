import { Link } from 'react-router-dom';

export default function Terms() {
  return (
    <div style={{ paddingTop: 22, maxWidth: 700, lineHeight: 1.6 }}>
      <div className="dim"><span className="prompt">➜</span> ~ robogarage terms</div>
      <h1>Terms of Service — RoboGarage</h1>

      <p className="dim" style={{ fontSize: 13 }}><b>Last updated:</b> October 27, 2026</p>
      <p className="dim" style={{ fontSize: 13 }}><b>Project:</b> RoboGarage — free project by <b>Leonardo Martellini</b></p>

      <h2>1. Acceptance of Terms</h2>
      <p>By accessing or using RoboGarage you accept these Terms of Service, the Privacy Policy, and the LICENSE. If you do not accept, do not use the service.</p>

      <h2>2. Service Description</h2>
      <p>RoboGarage is a platform for managing, sharing, and installing skills, agents, and plugins for AI systems (Codex, Claude Code, OpenCode, Pi, and others). The service is provided <b>free of charge</b>.</p>

      <h2>3. User Account</h2>
      <p>You may create an account with username and password. You are responsible for the confidentiality of your credentials and for all activity under your account.</p>

      <h2>4. User Content</h2>
      <p>Content you upload (skills, repositories, comments) remains owned by the author. By uploading content to RoboGarage you grant the platform a non-exclusive license to host, validate, display, and deliver it within the service.</p>

      <h2>5. Skill and Plugin Validation</h2>
      <p>RoboGarage offers automatic validation of skills and plugins. Validation is performed on technical grounds (manifest, frontmatter, cross-links) and <b>does not constitute a guarantee</b> of security, functionality, or fitness for use. You are solely responsible for the use of content downloaded.</p>

      <h2>6. Disclaimer of Liability</h2>
      <p>RoboGarage is provided "<b>as is</b>", without warranties of any kind, express or implied. The owner <b>Leonardo Martellini</b> and collaborators <b>disclaim all liability</b> for:</p>
      <ul>
        <li>Direct or indirect damages arising from use or inability to use the service;</li>
        <li>Loss of data, profits, or opportunities;</li>
        <li>Third-party content uploaded or downloaded via the platform;</li>
        <li>Vulnerabilities in skills, plugins, or agents installed via RoboGarage.</li>
      </ul>

      <h2>7. Intellectual Property</h2>
      <p>The RoboGarage software is distributed under the <b>MIT License</b>. Content uploaded by users remains owned by the respective authors.</p>

      <h2>8. Usage Restrictions</h2>
      <p>It is forbidden to use RoboGarage to:</p>
      <ul>
        <li>Upload illegal, defamatory, or third-party-rights-violating content;</li>
        <li>Distribute malware, malicious code, or skills designed to damage other systems;</li>
        <li>Violate others' privacy or collect personal data without consent.</li>
      </ul>

      <h2>9. Changes and Service Interruption</h2>
      <p>The service may be modified, suspended, or interrupted at any time without notice. Being a free project, no service level (SLA) is guaranteed.</p>

      <h2>10. Governing Law and Jurisdiction</h2>
      <p>These Terms are governed by Italian law. For any dispute, the court of your place of residence or domicile applies if you are a consumer in Italy, otherwise the court of the owner's residence.</p>

      <h2>11. Contacts</h2>
      <p>For questions about these Terms: contact the administrator of the RoboGarage instance you are using.</p>

      <hr style={{ margin: '30px 0', border: 'none', borderTop: '1px solid var(--line)' }} />
      <p className="dim" style={{ fontSize: 12 }}>
        © 2026 Leonardo Martellini. All rights reserved. RoboGarage is distributed under the MIT license.
      </p>
    </div>
  );
}
