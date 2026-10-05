# Localiza: redesign conceitual

Redesign do site da Localiza feito como estudo pessoal de UI, direção de arte e motion design.
A proposta: uma experiência mais premium, com menos poluição visual e animações guiadas pelo scroll.

> Projeto conceitual, sem vínculo oficial com a Localiza. Nomes, marcas e logotipos pertencem aos seus respectivos donos. Imagens geradas com IA para fins de estudo.

**Demo:** _link da Vercel aqui_

## Seções

- **Hero:** título que sobe por trás do carro (foto separada em camadas) e cards de vidro.
- **Reserva:** barra de busca com calendário e seletor de horário personalizados.
- **Frota:** troca de categorias com o carro saindo e entrando em cena, mais galeria de modelos.
- **Serviços:** grade de cards com revelação em sequência.
- **Perguntas frequentes:** acordeão animado com filtros por categoria.
- **App e rodapé:** banner em largura total e assinatura da marca revelada letra a letra.

## Stack

- [Vite](https://vite.dev): HTML, CSS e JavaScript puros
- [GSAP](https://gsap.com) com ScrollTrigger e SplitText
- [Lenis](https://lenis.darkroom.engineering) para o scroll suave

## Rodando localmente

```bash
npm install
npm run dev
```

Build de produção:

```bash
npm run build
npm run preview
```
