// Informações pessoais para a seção Sobre — edite em src/data/personal.ts

/** Data de nascimento para cálculo da idade (idade soma 1 em ago/set). Ajuste month (8 = ago, 9 = set) e day se quiser. */
export const birthDate = { year: 1998, month: 9, day: 1 };

export const personal = {
  fullName: "Davi Braga Moreira",
  /** Idade exibida (atualize quando fizer aniversário). Hoje: 26 anos. */
  age: 26,
  email: "davibragamoreira@hotmail.com",
  linkedin: "https://www.linkedin.com/in/davibragamor/",
  birthCity: "Varginha",
  currentCity: "São Paulo",
  alunoDestaque: "Aluno destaque no 2º e 3º ano do ensino médio.",
  alunoDestaqueEn: "Honor student in 2nd and 3rd year of high school.",
  idiomas: "Inglês intermediário/avançado",
  idiomasEn: "Intermediate/advanced English",
  formacaoEmUmaLinha:
    "Formado em Sistemas de Informação (UNIFEI). Pós em Inteligência de Dados em Negócios (ESPM) concluída, TCC nota 10. Em andamento: Engenharia de Software em IA.",
  formacaoEmUmaLinhaEn:
    "Degree in Information Systems (UNIFEI). Completed Business Data Intelligence (ESPM), thesis grade 10. In progress: Software Engineering in AI.",
  motivacao:
    "Gosto de ambientes que exigem adaptação e aprendizado contínuo. Busco trabalhar em problemas que ainda não domino — acho que é onde mais aprendo.",
  motivacaoEn:
    "I like environments that demand adaptation and continuous learning. I prefer working on problems I don’t yet master — that’s where I learn the most.",
  personalidade:
    "Interesse em análise de dados e números; extrovertido e conversador.",
  personalidadeEn:
    "Interest in data analysis and numbers; extroverted and conversational.",
};

/** Retorna a idade atual (aniversário em ago/set = soma 1 nesses meses). */
export function getAge(): number {
  const today = new Date();
  const { year, month } = birthDate;
  let age = today.getFullYear() - year;
  if (today.getMonth() + 1 < month) age -= 1;
  return age;
}
