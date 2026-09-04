import gsap from "gsap";
import { personal } from "./data";

type Kill = () => void;

function bind(root: HTMLElement, html: string, after?: (el: HTMLElement) => Kill | void): Kill {
  root.innerHTML = html;
  const k = after?.(root);
  return () => k?.();
}

function flowWidget(root: HTMLElement, nodes: string[], hint: string) {
  const html = `
    <p class="live-k">${hint}</p>
    <div class="flow">${nodes.map((n, i) => `<div class="fn" data-i="${i}"><i>${String(i + 1).padStart(2, "0")}</i><b>${n}</b></div>${i < nodes.length - 1 ? `<span class="fe">→</span>` : ""}`).join("")}</div>
    <button type="button" class="live-go" data-run>roda o fluxo</button>
    <p class="live-out" data-out>parado</p>`;
  return bind(root, html, (el) => {
    const ns = [...el.querySelectorAll<HTMLElement>(".fn")];
    const out = el.querySelector<HTMLElement>("[data-out]")!;
    const btn = el.querySelector<HTMLButtonElement>("[data-run]")!;
    let run = false;
    let tl: gsap.core.Timeline | null = null;
    const kick = () => {
      if (run) return;
      run = true;
      btn.disabled = true;
      tl?.kill();
      tl = gsap.timeline({
        onComplete: () => {
          run = false;
          btn.disabled = false;
          out.textContent = "ok · fluxo no ar";
        },
      });
      ns.forEach((n, i) => {
        tl!.to(n, { borderColor: "#d8ff3d", duration: 0.12 }, i * 0.38);
        tl!.call(() => {
          ns.forEach((x) => x.classList.toggle("on", x === n));
          out.textContent = `passo ${i + 1} · ${nodes[i]}`;
        }, [], i * 0.38);
      });
    };
    btn.addEventListener("click", kick);
    return () => {
      run = false;
      tl?.kill();
    };
  });
}

function skillWidget(root: HTMLElement) {
  return bind(
    root,
    `<div class="pair">
      <button type="button" class="live-go on" data-side="antes">antes</button>
      <button type="button" class="live-go" data-side="depois">depois</button>
    </div>
    <div class="pair-col">
      <div class="who" data-a><i>você</i><p data-a-txt></p></div>
      <div class="who" data-b><i>skill + agente</i><p data-b-txt></p></div>
    </div>`,
    (el) => {
      const a = el.querySelector<HTMLElement>("[data-a-txt]")!;
      const b = el.querySelector<HTMLElement>("[data-b-txt]")!;
      const set = (side: string) => {
        el.querySelectorAll("[data-side]").forEach((x) => x.classList.toggle("on", x.getAttribute("data-side") === side));
        if (side === "antes") {
          a.textContent = "explica de novo o recorte, a banda, o período, o join…";
          b.textContent = "espera. não tem o contexto. pergunta de novo.";
          el.querySelector("[data-a]")!.classList.add("on");
          el.querySelector("[data-b]")!.classList.remove("on");
        } else {
          a.textContent = "manda a skill.";
          b.textContent = "puxa a view, compara teste vs. controle, escreve o fup.";
          el.querySelector("[data-a]")!.classList.remove("on");
          el.querySelector("[data-b]")!.classList.add("on");
        }
      };
      set("antes");
      el.querySelectorAll<HTMLButtonElement>("[data-side]").forEach((btn) => btn.addEventListener("click", () => set(btn.dataset.side!)));
    }
  );
}

const DRAFTS = {
  frio: {
    baixo: "query crua. sem recorte. o time pergunta o que é isso.",
    alto: "monitoria de limite — teste vs. controle, banda de risco, mês de negócio. ainda seco.",
  },
  humano: {
    baixo: "olha, deu uma diferença no volume. acho que o teste foi bem.",
    alto: "teste vs. controle: volume de compras e saldo médio na mesma direção. banda X puxa o movimento. próximo passo: olhar NPL na janela.",
  },
};

function agentWidget(root: HTMLElement) {
  return bind(
    root,
    `<p class="live-k">parâmetros · ilustração do expediente</p>
    <label class="slid">contexto <input type="range" min="0" max="1" step="1" value="1" data-ctx /></label>
    <label class="slid">tom <input type="range" min="0" max="1" step="1" value="1" data-tom /></label>
    <div class="term" data-term></div>
    <button type="button" class="live-go" data-run>gera rascunho</button>`,
    (el) => {
      const term = el.querySelector<HTMLElement>("[data-term]")!;
      const ctx = el.querySelector<HTMLInputElement>("[data-ctx]")!;
      const tom = el.querySelector<HTMLInputElement>("[data-tom]")!;
      let tw: gsap.core.Tween | null = null;
      const write = () => {
        const c = ctx.value === "1" ? "alto" : "baixo";
        const t = tom.value === "1" ? "humano" : "frio";
        const text = DRAFTS[t][c];
        tw?.kill();
        const o = { n: 0 };
        term.textContent = "";
        tw = gsap.to(o, {
          n: text.length,
          duration: Math.min(1.6, text.length * 0.018),
          ease: "none",
          onUpdate: () => {
            term.textContent = text.slice(0, Math.floor(o.n));
          },
        });
      };
      el.querySelector("[data-run]")!.addEventListener("click", write);
      ctx.addEventListener("input", write);
      tom.addEventListener("input", write);
      write();
      return () => tw?.kill();
    }
  );
}

function mcpWidget(root: HTMLElement) {
  const tools = [
    { id: "read_sql", label: "read_sql", pay: "SELECT risk_band, vol FROM limit_experiments WHERE cohort='test'" },
    { id: "open_dash", label: "open_dash", pay: "dashboard · Core Limit · última versão de política" },
    { id: "copy_mail", label: "copy_mail", pay: personal.email },
  ];
  return bind(
    root,
    `<p class="live-k">MCP · o agente chama a tool</p>
    <div class="tools-row">${tools.map((t) => `<button type="button" class="live-go" data-tool="${t.id}">${t.label}</button>`).join("")}</div>
    <pre class="term" data-pay>payload vazio</pre>`,
    (el) => {
      const pay = el.querySelector<HTMLElement>("[data-pay]")!;
      el.querySelectorAll<HTMLButtonElement>("[data-tool]").forEach((b) => {
        b.addEventListener("click", () => {
          const t = tools.find((x) => x.id === b.dataset.tool)!;
          pay.textContent = `{"tool":"${t.id}","ok":true}\n${t.pay}`;
          if (t.id === "copy_mail") navigator.clipboard?.writeText(personal.email).catch(() => {});
        });
      });
    }
  );
}

function limitWidget(root: HTMLElement) {
  const rows = [
    { k: "volume de compras", t: 0.72, c: 0.54 },
    { k: "saldo médio diário", t: 0.61, c: 0.48 },
    { k: "utilização marginal", t: 0.44, c: 0.31 },
  ];
  return bind(
    root,
    `<p class="live-k">ilustração · teste vs. controle — não é KPI publicado</p>
    ${rows
      .map(
        (r, i) => `<div class="lab-row" data-i="${i}"><span>${r.k}</span>
      <div class="lab-bars"><i data-t style="width:0"></i><i data-c style="width:0"></i></div>
      <em>teste / controle</em></div>`
      )
      .join("")}`,
    (el) => {
      el.querySelectorAll<HTMLElement>(".lab-row").forEach((row, i) => {
        const r = rows[i];
        gsap.to(row.querySelector("[data-t]"), { width: `${r.t * 100}%`, duration: 0.9, delay: 0.15 * i, ease: "power2.out" });
        gsap.to(row.querySelector("[data-c]"), { width: `${r.c * 100}%`, duration: 0.9, delay: 0.15 * i, ease: "power2.out" });
      });
    }
  );
}

function packWidget(root: HTMLElement) {
  const items = [
    { n: "algoritmo guloso", w: 2, v: 8 },
    { n: "½-aproximado", w: 3, v: 9 },
    { n: "prog. dinâmica", w: 5, v: 12 },
    { n: "PLI / CPLEX", w: 6, v: 13 },
  ];
  const cap = 8;
  return bind(
    root,
    `<p class="live-k">mochila · capacidade ${cap} · clica guloso ou cabe</p>
    <div class="pack">${items.map((it, i) => `<button type="button" class="pk" data-i="${i}"><b>${it.n}</b><span>w ${it.w} · v ${it.v}</span></button>`).join("")}</div>
    <div class="pair"><button type="button" class="live-go" data-g>guloso</button><button type="button" class="live-go" data-x>o que cabe</button></div>
    <p class="live-out" data-out>escolhe os itens</p>`,
    (el) => {
      const on = new Set<number>();
      const out = el.querySelector<HTMLElement>("[data-out]")!;
      const paint = () => {
        el.querySelectorAll<HTMLElement>(".pk").forEach((b, i) => b.classList.toggle("on", on.has(i)));
        let w = 0,
          v = 0;
        on.forEach((i) => {
          w += items[i].w;
          v += items[i].v;
        });
        out.textContent = w > cap ? `estourou · peso ${w} > ${cap}` : `peso ${w} / ${cap} · valor ${v}`;
      };
      el.querySelectorAll<HTMLButtonElement>(".pk").forEach((b, i) =>
        b.addEventListener("click", () => {
          if (on.has(i)) on.delete(i);
          else on.add(i);
          paint();
        })
      );
      el.querySelector("[data-g]")!.addEventListener("click", () => {
        on.clear();
        [...items.keys()].sort((a, b) => items[b].v / items[b].w - items[a].v / items[a].w).forEach((i) => {
          const w = [...on].reduce((s, j) => s + items[j].w, 0);
          if (w + items[i].w <= cap) on.add(i);
        });
        paint();
      });
      el.querySelector("[data-x]")!.addEventListener("click", () => {
        on.clear();
        [0, 1].forEach((i) => on.add(i));
        paint();
      });
      paint();
    }
  );
}

function pingWidget(root: HTMLElement) {
  return bind(
    root,
    `<div class="term" data-term></div>
    <div class="pair">
      <button type="button" class="live-go" data-copy>copia e-mail</button>
      <a class="live-go" href="${personal.linkedin}" target="_blank" rel="noopener">abre LinkedIn</a>
    </div>`,
    (el) => {
      const term = el.querySelector<HTMLElement>("[data-term]")!;
      const lines = [`$ ping davi`, `pong  ·  < 24h`, personal.email, "tecla C também copia"];
      let n = 0;
      const o = { i: 0 };
      const tw = gsap.to(o, {
        i: lines.join("\n").length,
        duration: 1.8,
        ease: "none",
        onUpdate: () => {
          term.textContent = lines.join("\n").slice(0, Math.floor(o.i));
        },
      });
      el.querySelector("[data-copy]")!.addEventListener("click", () => {
        navigator.clipboard?.writeText(personal.email).catch(() => {});
        n++;
        term.textContent += `\ncopiado ×${n}`;
      });
      return () => tw.kill();
    }
  );
}

const FACTORIES: Record<string, (el: HTMLElement) => Kill | void> = {
  n8n: (el) => flowWidget(el, ["Webhook", "Filtro", "SQL", "Slack", "Done"], "fluxo de exemplo · n8n"),
  flux: (el) => flowWidget(el, ["Trigger", "IF", "Databricks", "Mail", "Log"], "pipeline · o mesmo motor, outro recorte"),
  skill: (el) => skillWidget(el),
  agent: (el) => agentWidget(el),
  mcp: (el) => mcpWidget(el),
  limit: (el) => limitWidget(el),
  pack: (el) => packWidget(el),
  ping: (el) => pingWidget(el),
};

export function mountLive(root: HTMLElement) {
  const kills: Kill[] = [];
  root.querySelectorAll<HTMLElement>("[data-live]").forEach((el) => {
    const id = el.dataset.live!;
    const fn = FACTORIES[id];
    if (fn) {
      const k = fn(el);
      if (k) kills.push(k);
    }
  });
  return () => kills.forEach((k) => k());
}
