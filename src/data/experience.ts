// Experiências do seu LinkedIn — edite em src/data/experience.ts

export type Experience = {
  id: string;
  company: string;
  role: string;
  description: string;
  tags: string[];
  highlights: string[];
  logo?: string;
  period?: string;
};

export const experiences: Experience[] = [
  {
    id: "nubank",
    company: "Nubank",
    role: "Business Analyst – Core Limit Policies (Excellence)",
    description:
      "Políticas de limite de cartão em múltiplos países. Experimentos (teste vs. controle), métricas de cartão, pipelines de monitoria em Databricks e dashboards internos.",
    tags: [
      "Databricks",
      "SQL",
      "Dashboards",
      "Métricas de cartão",
      "A/B Testing",
    ],
    highlights: [
      "Analiso experimentos de aumento de limite de cartão comparando grupos de teste e controle, medindo impacto em volume de compras, saldo médio diário que rende juros, saldo em aberto e limite.",
      "Calculo métricas como diferença de volume de compras, diferença de saldo médio, diferença de saldo em aberto e utilização marginal (ex.: volume de compras extra por real de limite extra), para entender se o aumento de limite está sendo saudável em termos de uso, receita e risco.",
      "Desenvolvo pipelines de monitoria em Databricks, agregando métricas de budget por mês de negócio, banda de risco, política e versão, alinhadas com visão de FP&A.",
      "Crio e evoluo dashboards internos para acompanhar, em tempo quase real, o desempenho de políticas e experimentos de limite.",
      "Participo da implementação de regras de política em produção (ex.: blocks ligados à conformidade bancária), ajustando datasets de entrada e blocks de decisão nos sistemas de política e dados.",
      "Trabalho em parceria com engenheiros de dados e cientistas de dados para alinhar modelos de risco, modelos de saldo médio e métricas que envolvem cartão com a prática de política, garantindo que monitorias e decisões reflitam corretamente o comportamento real da carteira.",
      "Documento análises, decisões e aprendizados em ferramentas de documentação e apresentações, ajudando a traduzir conceitos de métricas de cartão, risco e receita em narrativas claras para stakeholders técnicos e de negócio.",
    ],
    period: "jun 2025 – presente",
  },
  {
    id: "flash",
    company: "Flash",
    role: "Analista de Negócios",
    description:
      "Responsável por transformar dados operacionais e de receita em análises estratégicas para apoiar a tomada de decisão nas áreas Comercial e de Customer Success. Atuei como ponte entre dados e negócio, garantindo que as métricas de performance fossem rastreáveis, confiáveis e acionáveis para liderança e operação.",
    tags: [
      "Dashboards",
      "Metabase",
      "SQL",
      "PL/SQL",
      "HubSpot",
      "Visualização de dados",
    ],
    highlights: [
      "Criação e manutenção de dashboards no Metabase com KPIs de performance, funil de vendas e indicadores de receita, permitindo acompanhamento em tempo quase real pela área Comercial e por Customer Success.",
      "Automação de relatórios com SQL e PL/SQL, reduzindo o tempo operacional de consolidação e aumentando a confiabilidade e a reprodutibilidade dos números apresentados à diretoria.",
      "Interface constante com áreas de CS e Comercial para mapeamento de processos, desenho de métricas e identificação de oportunidades de melhoria contínua com base em evidências.",
      "Identificação de gargalos operacionais e proposição de soluções orientadas a dados, incluindo sugestões de novos indicadores e ajustes em fluxos de acompanhamento de metas.",
      "Participação em reuniões de acompanhamento de resultados e no desenho de metas comerciais, trazendo visão analítica e suporte à priorização de iniciativas com impacto em receita.",
    ],
    period: "jan 2024 - jun 2025",
  },
  {
    id: "discover",
    company: "Discover",
    role: "Analista Comercial",
    description:
      "Atuação estratégica na área comercial com foco em geração de oportunidades, qualificação de leads e suporte à performance de vendas. Utilizei dados de comportamento e histórico de clientes para orientar decisões de abordagem, segmentação e metas, em estreita ligação com o time de vendas e liderança.",
    tags: [
      "Python",
      "Análise de dados",
      "Qualificação de leads",
      "Inteligência Comercial",
    ],
    highlights: [
      "Estruturação e análise do funil de vendas com base em dados de comportamento e histórico de clientes, identificando etapas de maior conversão e pontos de fricção para priorizar ações comerciais.",
      "Apoio à construção de estratégias de abordagem comercial e segmentação de leads, utilizando análise de dados para definir critérios de qualificação e priorização de oportunidades.",
      "Produção de relatórios semanais para alinhamento com lideranças e definição de metas comerciais, com foco em conversão, pipeline e desempenho por canal ou segmento.",
      "Uso de Python para automação de análises e consolidação de fontes de dados, aumentando a velocidade e a consistência das entregas para o time comercial.",
      "Trabalho em equipe com SDRs e representantes de vendas para alinhar métricas, expectativas e critérios de sucesso dos processos de prospecção e fechamento.",
    ],
    period: "jul 2023 - jan 2024",
  },
  {
    id: "conta-simples",
    company: "Conta Simples",
    role: "Estágio em Sales Ops",
    description:
      "Responsável por estruturar e automatizar processos de pré-venda, apoiando a operação comercial com dados e tecnologia. Atuei na base da inteligência comercial: desde a gestão de listas e ferramentas de prospecção até a construção de visibilidade sobre desempenho da equipe de SDRs e conversão de oportunidades.",
    tags: [
      "HubSpot",
      "Python",
      "Análise de negócios",
      "Pré-vendas",
      "Apollo",
      "Inteligência Comercial",
    ],
    highlights: [
      "Automatização de processos no HubSpot e gestão de listas de prospecção com Apollo, Lusha e Snov.io, garantindo que a equipe de SDRs tivesse bases atualizadas e segmentadas para campanhas de outbound.",
      "Desenvolvimento de relatórios com métricas comerciais (volume de oportunidades, conversão por estágio, tempo de ciclo) e acompanhamento da conversão de oportunidades até o fechamento.",
      "Criação de painéis de acompanhamento de desempenho da equipe de SDRs (pré-vendas), permitindo que liderança e time visualizassem metas, produtividade e evolução ao longo do tempo.",
      "Interface com times de vendas e marketing para alinhamento de estratégias de captação, definição de critérios de qualificação de leads e melhoria contínua dos processos de pré-venda.",
      "Uso de Python para rotinas de enriquecimento e validação de dados de prospecção, reduzindo trabalho manual e aumentando a qualidade das listas utilizadas pela operação comercial.",
    ],
    period: "mai 2022 - jul 2023",
  },
  {
    id: "aiesec",
    company: "AIESEC no Brasil",
    role: "Account Manager",
    description:
      "Atuação em gestão de contas e relacionamento no programa de intercâmbio da AIESEC. Responsável por acompanhar candidatos e parceiros ao longo da jornada, desde a qualificação até o fechamento de vagas, garantindo boa experiência e alinhamento de expectativas entre todos os envolvidos.",
    tags: [
      "Experiência do cliente",
      "Negociação",
      "Qualificação de leads",
      "Vendas e marketing",
    ],
    highlights: [
      "Gestão de relacionamento com candidatos a intercâmbio e com empresas/parceiros que ofertam vagas, atuando como ponto de contato e facilitador do processo de matching.",
      "Qualificação de leads e acompanhamento do funil de conversão, com foco em entender necessidades, alinhar expectativas e fechar acordos que atendessem tanto aos candidatos quanto aos parceiros.",
      "Negociação de condições e prazos entre as partes, buscando resultados que mantivessem a satisfação e a credibilidade do programa.",
      "Trabalho em equipe com outros membros da AIESEC para atingir metas de colocação e para melhorar processos de vendas e marketing do produto de intercâmbio.",
    ],
    period: "mar 2022 - jul 2023",
  },
  {
    id: "camara-itajuba",
    company: "Câmara Municipal de Itajubá",
    role: "Estagiário",
    description:
      "Estágio na Câmara Municipal de Itajubá, com foco em apoio a processos administrativos e legislativos. Atuei em atividades que envolviam organização de informações, suporte à análise de dados e interface com diferentes setores da instituição.",
    tags: ["Python", "Negociação"],
    highlights: [
      "Apoio a rotinas administrativas e à organização de documentos e informações utilizadas pelos setores da Câmara.",
      "Utilização de Python para tarefas de tratamento e consolidação de dados, quando aplicável aos processos do estágio.",
      "Interface com servidores e setores internos para alinhamento de demandas, prazos e entregas, desenvolvendo comunicação e capacidade de negociação em ambiente institucional.",
    ],
    period: "dez 2021 - mai 2022",
  },
  {
    id: "unifei-estagio",
    company: "Estágio – Universidade Federal de Itajubá",
    role: "Estagiário UNIFEI",
    description:
      "Estágio na Universidade Federal de Itajubá (UNIFEI), vinculado a projetos ou setores da instituição. Experiência de imersão no ambiente universitário e em atividades que demandaram organização, comunicação e trabalho em equipe.",
    tags: ["Negociação"],
    highlights: [
      "Apoio a projetos ou demandas do setor de estágio, com foco em cumprimento de prazos e qualidade das entregas.",
      "Desenvolvimento de habilidades de comunicação e negociação no trato com colegas, professores e gestores da universidade.",
      "Vivência em ambiente acadêmico e institucional, reforçando disciplina e capacidade de priorização em paralelo à graduação em Sistemas de Informação.",
    ],
    period: "set 2021 - mar 2022",
  },
  {
    id: "aaa-unifei",
    company: "Associação Atlética Acadêmica UNIFEI",
    role: "Vice-diretor de Eventos",
    description:
      "Atuação na diretoria de eventos da Associação Atlética Acadêmica da UNIFEI. Responsável por apoiar o planejamento, a execução e o controle financeiro de eventos esportivos e de integração da atlética, em conjunto com a diretoria e com outros membros da associação.",
    tags: ["Análise financeira", "Negociação", "Habilidades analíticas"],
    highlights: [
      "Participação no planejamento e na organização de eventos da atlética (campeonatos, integrações, festas), desde a definição de escopo até a logística e o acompanhamento no dia.",
      "Apoio à análise financeira dos eventos: estimativa de custos, acompanhamento de receitas e despesas, e contribuição para decisões que mantivessem o equilíbrio orçamentário da atlética.",
      "Negociação com fornecedores, parceiros e patrocinadores para viabilizar eventos dentro do orçamento e com a qualidade esperada pela comunidade acadêmica.",
      "Trabalho em equipe com a diretoria e com voluntários, desenvolvendo habilidades analíticas e de gestão de projetos em ambiente voluntário e de alto envolvimento.",
    ],
    period: "mar 2018 - out 2019",
  },
];
