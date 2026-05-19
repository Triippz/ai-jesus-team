# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Purpose

Slash command definitions for the core-superpowers plugin. Commands are thin wrappers that invoke exactly one skill.

## Commands

| Command | File | Invokes Skill |
|---------|------|---------------|
| /brainstorm | brainstorm.md | core-superpowers:brainstorming |
| /write-plan | write-plan.md | core-superpowers:writing-plans |
| /tdd | tdd.md | core-superpowers:tdd |
| /execute-plan | execute-plan.md | core-superpowers:executing-plans |
| /debug | debug.md | core-superpowers:debugging |
| /review | review.md | core-superpowers:code-review |
| /verify | verify.md | core-superpowers:verification |
| /finish | finish.md | core-superpowers:finishing-branch |
| /mr | mr.md | core-superpowers:merge-request |
| /resolve-reviews | resolve-reviews.md | core-superpowers:resolve-reviews |
| /plan-to-jira | plan-to-jira.md | core-superpowers:plan-to-jira |
| /update-jira | update-jira.md | core-superpowers:update-jira |
| /spec | spec.md | core-superpowers:spec-driven-development |

## File Format

Every command file has `disable-model-invocation: true` in frontmatter and a single line invoking its skill. Commands contain zero logic.
