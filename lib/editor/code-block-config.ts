/**
 * Code Block Configuration with Syntax Highlighting
 * Using lowlight (wrapper around highlight.js)
 */

import { createLowlight } from 'lowlight';
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import python from 'highlight.js/lib/languages/python';
import java from 'highlight.js/lib/languages/java';
import go from 'highlight.js/lib/languages/go';
import rust from 'highlight.js/lib/languages/rust';
import css from 'highlight.js/lib/languages/css';
import xml from 'highlight.js/lib/languages/xml'; // For HTML
import sql from 'highlight.js/lib/languages/sql';
import bash from 'highlight.js/lib/languages/bash';
import markdown from 'highlight.js/lib/languages/markdown';
import json from 'highlight.js/lib/languages/json';
import yaml from 'highlight.js/lib/languages/yaml';

// Create lowlight instance
const lowlight = createLowlight();

// Register languages with lowlight
lowlight.register('javascript', javascript);
lowlight.register('typescript', typescript);
lowlight.register('python', python);
lowlight.register('java', java);
lowlight.register('go', go);
lowlight.register('rust', rust);
lowlight.register('css', css);
lowlight.register('html', xml);
lowlight.register('xml', xml);
lowlight.register('sql', sql);
lowlight.register('bash', bash);
lowlight.register('shell', bash);
lowlight.register('markdown', markdown);
lowlight.register('json', json);
lowlight.register('yaml', yaml);

export { lowlight };
