## Claude Skills

Examples of Claude skills to build plugins for oshea. See [create-oshea-plugin/SKILL.md](../../.claude/skills/create-oshea-plugin/SKILL.md) for more information.

This also applies to Codex CLI. The repo contains a symlink for Codex CLI.
```
.agents/skills/create-oshea-plugin -> .claude/skills/create-oshea-plugin
```

## 1) Thank You Card

Supplying a short prompt and a reference image.

### Prompt

> `$create-oshea-plugin` Make the plugin that generates this image from markdown. Use plugin name thank-you-card.

### Comparison 

<table>
  <tr>
    <td><a href="../images/ai/thank-you-card.jpg">
      <img src="../images/ai/thank-you-card.jpg" width="340px">
      <br><strong><a href="https://marketplace.canva.com/EAFoad9JhOw/1/0/1236w/canva-gray-and-brown-simple-business-thank-you-postcard-rzDbHZlQpwI.jpg">Original JPG (canva.com)</a></strong></a>
    </td>
    <td><a href="../images/ai/thank-you-card-ai.png">
      <img src="../images/ai/thank-you-card-ai.png" width="340px">
      <br><strong>Codex 2026-02-23</strong></a>
    </td>
  </tr>
</table>

### Details

```
cli:            OpenAI Codex (v0.104.0)
model:          gpt-5.3-codex high
date:           2026-02-22
duration:       6 minutes
plugin dir:     plugins/thank-you-card/
output pdf:     /tmp/oshea-output/thank-you-card.pdf
```

## 2) Study Cards

Building a plugin from a prompt alone. The agent did not use [`docs/walkthroughs/generate-mobile-study-cards.md`](../walkthroughs/generate-mobile-study-cards.md).

### Prompt

> ```
> $create-oshea-plugin Make an oshea plugin named study-card-deck that generates a deck PDF from a directory of markdown study cards.
> ```

### Output

<table>
  <tr>
    <td><a href="../images/ai/study-card-deck-1.png">
      <img src="../images/ai/study-card-deck-1.png" width="220px">
      <br><strong>Card 1</strong></a>
    </td>
    <td><a href="../images/ai/study-card-deck-2.png">
      <img src="../images/ai/study-card-deck-2.png" width="220px">
      <br><strong>Card 2</strong></a>
    </td>
    <td><a href="../images/ai/study-card-deck-3.png">
      <img src="../images/ai/study-card-deck-3.png" width="220px">
      <br><strong>Card 3</strong></a>
    </td>
    <td><a href="../images/ai/study-card-deck-4.png">
      <img src="../images/ai/study-card-deck-4.png" width="220px">
      <br><strong>Card 4</strong></a>
    </td>
  </tr>
</table>

### Details

```
cli:            OpenAI Codex (v0.104.0)
model:          gpt-5.3-codex high
date:           2026-02-23
duration:       4 minutes
plugin dir:     plugins/study-card-deck
output pdf:     /tmp/oshea-output/biology-midterm-review-deck.pdf
```

## 3) GitHub Social Preview

No recorded run yet in this repository state.
