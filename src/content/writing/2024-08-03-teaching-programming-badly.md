---
title: "How To Teach Programming Badly"
date: 2024-08-03
description: "A list of principles that will help you teach programming badly and ensure your students learn as little as possible."
topics: [teaching, engineering]
selected: true
---

Much has been written about how to teach programming — or any other topic — well.
The following is a list of some principles that will help you teach programming *badly*,
and ensure your students learn as little as possible.

- **Deal exclusively in finished solutions.**
  To ensure your students don't pick up any tacit knowledge about how to break down problems and solve them step by step,
  you should only explain finished solutions.
  This also ensures they will be more lost the first time they make a typo or other mistake when trying to apply what they learned themselves.
- **Ban iteration.**
  You should teach students to get things right and optimal the first time around.
  Don't water down expectations by allowing them to iterate on and improve solutions after the first try.
  Expect completeness — teaching students how to incorporate later changes to requirements and extensions to their code
  only encourages being sloppy with the initial requirements.
- **Avoid debugging.**
  Expect perfection and punish errors with bad grades.
  Every typo or bug is a failure, not an opportunity to figure out what went wrong and how to fix it.
- **Expect omniscience.**
  Having to work with documentation and researching prior approaches and patterns indicates a lack of knowledge.
  Instead of expecting this, only give students problems they can fully solve with the knowledge they should have at hand.
- **No low-level explanations.**
  In order to make sure your students stay somewhat confused,
  treat code as a set of magic incantations.
  Don't, under any circumstances, explain how individual parts of the code are parsed,
  and which parts are meaningful to the computer (such as keywords or library function invocations)
  vs. which are arbitrary and defined by them (variable names etc.).
- **Keep problems very small.**
  Only deal with problems that can be solved in a single function.
  Don't require any code reuse or larger architectural considerations.
  Your students might learn how to break down larger problems,
  which they will not need working on real-world systems.
- **Lengthen feedback loops.**
  Computers afford many opportunities for short feedback loops.
  Avoid being seduced by this!
  Ensure code is never run and tested, only written,
  and provide feedback on mistakes much later.
  Don't encourage hastily playing around with unfinished code —
  expect students to get it right on the first try by mentally modelling the entire execution.
- **Skip meta-level distractions.**
  Don't distract your students with things like build systems or version control.
  Treat coding as a task done in isolation.
  Ignore how code is evolved over time,
  collaborated on,
  or executed in the real world.
