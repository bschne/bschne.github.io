---
layout: post
title:  "Error Page Redirects Should Not Lose Information"
date:   2024-03-04 20:00:00 +0100
categories:
excerpt: When showing an error page, make sure you don't drop more information from the request than you have to.
---

Many web applications will implement some kind of redirect on error responses in order to improve how the error is handled for the user (e.g. by displaying a friendly error page with some further information and means of contacting support) or for the business running the website or both (e.g. redirecting obsolete product links in a shop to some related category page with other products the user might be interested in buying.

This is nicer than just leaving the user stranded and displaying some hard-to-understand error code or similar, but it often has the downside of dropping information. For example, server error pages on Twitter/X will sometimes trap you by redirecting to a static error page path, so hitting refresh never actually does anything other than re-loading the error page you're on, even if the underlying error was temporary. In the case of online shops, redirects are sometimes done without even showing you a message that the product you were trying to get to is no longer available, which is bad communication. Another example I just encountered is while loading an [invalid DOI](https://doi.org/10.1162%2Fjmlr.2003.3.4-5.993), where the error page drops any mention of the DOI I was trying to load, leaving me with no way of checking whether I made a typo or something else went wrong without "retracing my steps" manually.

If you're implementing friendly errors for a website, you should ensure the user has as good a path forward as possible, but also that no information provided by the user is entirely dropped.