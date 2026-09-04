// TCC — Uma Introdução ao Leilão da Mochila
// Coloque imagens em public/tcc/ e o PDF em public/tcc/

export type TccImage = { src: string; alt: string; caption?: string };

export const tcc = {
  title: "Uma Introdução ao Leilão da Mochila",
  /** Explicação em uma frase, de forma acessível — “como explicar para uma criança”. */
  emUmaFrase:
    "Você tem uma mochila que só aguenta um certo peso e um monte de coisas que pode levar. O leilão da mochila é um jeito de decidir *quais* coisas escolher e *quanto* pagar por elas para caber na mochila e valer o máximo possível.",
  subtitle: "Teoria dos Jogos, Design de Mecanismos e o Problema da Mochila",
  year: "2023",
  institution: "Universidade Federal de Itajubá",
  course: "Bacharelado em Sistemas de Informação",

  abstract:
    "A Teoria dos Jogos e o design de mecanismos desempenham papéis fundamentais na compreensão e criação de estruturas e regras em situações estratégicas. O trabalho explora os princípios fundamentais da Teoria dos Jogos e do Design de Mecanismos, destacando sua aplicação em contextos diversos, desde leilões até problemas clássicos de otimização, como o leilão da mochila, que envolve a resolução do conhecido problema da mochila. " +
    "São explorados leilões de primeiro e segundo preço, enfatizando propriedades desejáveis como mecanismos computacionalmente eficientes e maximizadores de bem-estar, além de conceitos como estratégias dominantes e leilões de busca patrocinada. O trabalho aborda o Design de Mecanismos com foco na maximização do bem-estar social, o ambiente de parâmetro único e o Lema de Myerson, e apresenta algoritmos para o problema da mochila (guloso, aproximado, programação dinâmica e programação linear inteira). " +
    "A conclusão destaca a comparação entre os métodos implementados (em C++, com instâncias do repositório 0/1 Knapsack e resolvedor CPLEX), mostrando que o algoritmo guloso e o aproximado são opções eficientes para instâncias grandes, com soluções próximas do ótimo.",

  sections: [
    {
      title: "Objetivo",
      content:
        "Fornecer uma introdução acessível à Teoria dos Jogos e ao Design de Mecanismos, apresentando conceitos como estratégias dominantes, equilíbrio de Nash e dilemas sociais, e sua aplicação em leilões (primeiro e segundo preço, Vickrey, busca patrocinada) e no leilão da mochila. O trabalho visa ainda explorar algoritmos para o problema da mochila e comparar abordagens exatas e aproximadas.",
    },
    {
      title: "Metodologia",
      content:
        "Revisão bibliográfica em Teoria dos Jogos e Design de Mecanismos (Osborne & Rubinstein, Myerson, Roughgarden, Nisan et al., Cormen et al.). Apresentação do Paradoxo de Braess, equilíbrio de Nash, leilões de item único e de busca patrocinada, ambiente de parâmetro único e Lema de Myerson. Implementação em C++ (g++ 11.4, Ubuntu 22.04) de quatro abordagens para o problema da mochila: algoritmo guloso, algoritmo ½-approximado, programação dinâmica e programação linear inteira (resolvedor IBM ILOG CPLEX 20.1). Instâncias obtidas do repositório Instances of 0/1 Knapsack Problem.",
    },
    {
      title: "Resultados e conclusões",
      content:
        "O algoritmo guloso e o aproximado são muito mais rápidos que os métodos exatos (programação dinâmica e PLI), com soluções próximas da ótima nas instâncias testadas. O algoritmo guloso é o mais rápido; o aproximado é um pouco mais lento mas oferece garantia de pelo menos 50% do ótimo. A escolha do algoritmo depende do trade-off entre tempo de execução e qualidade da solução. O trabalho conclui que a Teoria dos Jogos, o design de mecanismos e a aplicação de algoritmos específicos são fundamentais para o desenvolvimento de regras e mecanismos em contextos estratégicos, como leilões e otimização combinatória.",
    },
  ],

  technologies: [
    "Teoria dos Jogos",
    "Design de Mecanismos",
    "C++",
    "IBM ILOG CPLEX",
    "Algoritmos (guloso, aproximação, PD, PLI)",
  ],

  keywords: "Teoria dos Jogos; Design de Mecanismos; Tutorial",

  images: [] as TccImage[],
};
