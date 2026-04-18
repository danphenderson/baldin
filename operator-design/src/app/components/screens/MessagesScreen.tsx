import { useState } from "react";
import { OP } from "../op";

const CONVERSATIONS = [
  { id: 1, name: "Anika Chen", role: "Stripe · Frontend Platform", preview: "Your outreach note is close. Tighten the first paragraph and I can share context on the team.", time: "09:41", unread: 2, stage: "Follow-Up", stageColor: OP.warning },
  { id: 2, name: "Maria Garcia", role: "Figma · Design Systems", preview: "Send the case study when you have a minute. I think the internal tooling angle will land well.", time: "08:55", unread: 0, stage: "Replied", stageColor: OP.info },
  { id: 3, name: "Luca Romano", role: "Linear · Backend Platform", preview: "Happy to compare notes on how platform scope changed after the reorg.", time: "Apr 16", unread: 1, stage: "Connected", stageColor: OP.success },
  { id: 4, name: "Sofia Reyes", role: "Notion · Growth Lead", preview: "Send the company page and I can tell you who is best to talk to first.", time: "Apr 15", unread: 0, stage: "Warm intro", stageColor: OP.success },
  { id: 5, name: "Yuki Tanaka", role: "Anthropic · Research Ops", preview: "Happy to swap notes on the team and interview loop next week.", time: "Apr 14", unread: 0, stage: "Coffee chat", stageColor: OP.success },
  { id: 6, name: "Omar Shaikh", role: "Palantir · Forward Deployed", preview: "Checking back in here in case my last note got buried.", time: "Apr 13", unread: 0, stage: "Waiting", stageColor: OP.warning },
];

const MESSAGES = [
  { id: 1, from: "Jordan Kim", me: true, time: "09:20", body: "Hi Anika - I am exploring the Staff Frontend Platform role at Stripe. Baldin surfaced it as a strong match, and I would value your read on how the team is evolving before I send a cold reach-out." },
  { id: 2, from: "Anika Chen", me: false, time: "09:31", body: "Happy to help. The team is leaning harder into internal tooling and platform reliability right now. If you send the note you are planning to use, I can tell you where it feels strong or generic." },
  { id: 3, from: "Jordan Kim", me: true, time: "09:35", body: "Perfect. I sent a short intro plus a portfolio summary focused on design systems and platform work. I am mostly trying to make the first message sharper, not force an intro before the note is solid." },
  { id: 4, from: "Anika Chen", me: false, time: "09:41", body: "That framing is right. Keep it direct, mention the internal-product angle, and circle back after you send it. If it feels like a fit, I can point you to the right person next." },
];

export function MessagesScreen() {
  const [active, setActive] = useState(1);
  const [draft, setDraft] = useState("");
  const convo = CONVERSATIONS.find(c => c.id === active)!;

  return (
    <div style={{ display: "flex", height: "100%", background: OP.bg }}>
      {/* Conversation list */}
      <div style={{ width: 280, flexShrink: 0, borderRight: `1px solid ${OP.s1}`, display: "flex", flexDirection: "column", background: OP.base }}>
        {/* Search */}
        <div style={{ padding: "12px 14px", borderBottom: `1px solid ${OP.s0}` }}>
          <div style={{ height: 30, background: OP.s0, border: `1px solid ${OP.s1}`, borderRadius: OP.r2, display: "flex", alignItems: "center", padding: "0 10px", gap: 6 }}>
            <span style={{ fontSize: 11, color: OP.t2 }}>🔍</span>
            <span style={{ fontFamily: OP.fontBody, fontSize: 12, color: OP.t2 }}>Search messages…</span>
          </div>
        </div>
        {/* List */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {CONVERSATIONS.map(c => {
            const sel = c.id === active;
            return (
              <div
                key={c.id}
                onClick={() => setActive(c.id)}
                style={{ padding: "12px 14px", borderBottom: `1px solid ${OP.s0}`, background: sel ? OP.accentDim : "transparent", borderLeft: `2px solid ${sel ? OP.accent : "transparent"}`, cursor: "pointer" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: OP.rFull, background: `${c.stageColor}20`, border: `1px solid ${c.stageColor}33`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <span style={{ fontFamily: OP.fontBody, fontWeight: 700, fontSize: 10, color: c.stageColor }}>{c.name.split(" ").map(n => n[0]).join("")}</span>
                    </div>
                    <div>
                      <span style={{ fontFamily: OP.fontBody, fontWeight: sel || c.unread > 0 ? 600 : 400, fontSize: 13, color: OP.t0 }}>{c.name}</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                    <span style={{ fontFamily: OP.fontMono, fontSize: 10, color: OP.t2 }}>{c.time}</span>
                    {c.unread > 0 && (
                      <div style={{ width: 16, height: 16, borderRadius: OP.rFull, background: OP.accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ fontFamily: OP.fontMono, fontWeight: 600, fontSize: 9, color: OP.bg }}>{c.unread}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                  <div style={{ width: 5, height: 5, borderRadius: OP.rFull, background: c.stageColor, flexShrink: 0 }} />
                  <span style={{ fontFamily: OP.fontBody, fontSize: 11, color: c.stageColor }}>{c.stage}</span>
                  <span style={{ fontFamily: OP.fontBody, fontSize: 11, color: OP.t2 }}>· {c.role}</span>
                </div>
                <p style={{ fontFamily: OP.fontBody, fontSize: 11.5, color: OP.t1, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.preview}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Thread */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {/* Thread header */}
        <div style={{ height: 52, borderBottom: `1px solid ${OP.s1}`, display: "flex", alignItems: "center", padding: "0 20px", justifyContent: "space-between", background: OP.base, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: OP.rFull, background: `${convo.stageColor}20`, border: `1px solid ${convo.stageColor}33`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontFamily: OP.fontBody, fontWeight: 700, fontSize: 11, color: convo.stageColor }}>{convo.name.split(" ").map(n => n[0]).join("")}</span>
            </div>
            <div>
              <p style={{ fontFamily: OP.fontBody, fontWeight: 600, fontSize: 14, color: OP.t0, margin: 0 }}>{convo.name}</p>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{ width: 5, height: 5, borderRadius: OP.rFull, background: convo.stageColor }} />
                <span style={{ fontFamily: OP.fontBody, fontSize: 11.5, color: convo.stageColor }}>{convo.stage}</span>
                <span style={{ fontFamily: OP.fontBody, fontSize: 11.5, color: OP.t2 }}>· {convo.role}</span>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button style={{ fontFamily: OP.fontBody, fontWeight: 600, fontSize: 12, padding: "5px 12px", background: OP.accentDim, border: `1px solid ${OP.accent}28`, borderRadius: OP.r2, color: OP.accent, cursor: "pointer" }}>View profile</button>
            <button style={{ fontFamily: OP.fontBody, fontWeight: 600, fontSize: 12, padding: "5px 12px", background: OP.accent, border: "none", borderRadius: OP.r2, color: OP.bg, cursor: "pointer" }}>Draft follow-up</button>
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
          {MESSAGES.map(msg => (
            <div key={msg.id} style={{ display: "flex", flexDirection: msg.me ? "row-reverse" : "row", gap: 10 }}>
              {!msg.me && (
                <div style={{ width: 28, height: 28, borderRadius: OP.rFull, background: `${convo.stageColor}20`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, alignSelf: "flex-end" }}>
                  <span style={{ fontFamily: OP.fontBody, fontWeight: 700, fontSize: 9, color: convo.stageColor }}>{msg.from.split(" ").map(n => n[0]).join("")}</span>
                </div>
              )}
              <div style={{ maxWidth: "72%", display: "flex", flexDirection: "column", gap: 3, alignItems: msg.me ? "flex-end" : "flex-start" }}>
                <span style={{ fontFamily: OP.fontMono, fontSize: 10, color: OP.t2 }}>{msg.from} · {msg.time}</span>
                <div style={{ padding: "10px 14px", borderRadius: msg.me ? `${OP.r3}px ${OP.r1}px ${OP.r3}px ${OP.r3}px` : `${OP.r1}px ${OP.r3}px ${OP.r3}px ${OP.r3}px`, background: msg.me ? OP.accentDim : OP.raised, border: `1px solid ${msg.me ? OP.accent + "22" : OP.s1}` }}>
                  <p style={{ fontFamily: OP.fontBody, fontSize: 13.5, color: OP.t0, margin: 0, lineHeight: 1.6 }}>{msg.body}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Compose */}
        <div style={{ padding: "12px 20px", borderTop: `1px solid ${OP.s1}`, background: OP.base, flexShrink: 0 }}>
          <div style={{ border: `1px solid ${draft ? OP.s2 : OP.s1}`, borderRadius: OP.r3, overflow: "hidden", transition: "border-color 0.12s" }}>
            <textarea
              value={draft}
              onChange={e => setDraft(e.target.value)}
              placeholder={`Reply to ${convo.name}…`}
              rows={3}
              style={{ width: "100%", background: OP.raised, border: "none", padding: "12px 14px", fontFamily: OP.fontBody, fontSize: 13.5, color: OP.t0, resize: "none", outline: "none", lineHeight: 1.5, boxSizing: "border-box" }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", borderTop: `1px solid ${OP.s0}`, background: OP.bg }}>
              <span style={{ fontFamily: OP.fontBody, fontSize: 11, color: OP.t2 }}>Send from: jordan@baldin.io</span>
              <button style={{ fontFamily: OP.fontBody, fontWeight: 600, fontSize: 12, padding: "6px 16px", background: draft ? OP.accent : OP.s1, border: "none", borderRadius: OP.r2, color: draft ? OP.bg : OP.t2, cursor: draft ? "pointer" : "default", transition: "all 0.12s" }}>Send</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
