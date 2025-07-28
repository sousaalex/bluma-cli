import React, { useState, useEffect } from 'react';
import { render, Box, Text } from 'ink';
import BigText from 'ink-big-text';

const BRAND_COLORS = {
  main: 'cyan',
  accent: 'magenta',
  shadow: 'blue',
  greydark: '#444',
};

const AnimatedAscii = () => {
    const [showTitle, setShowTitle] = useState(false);

    useEffect(() => {
        const t1 = setTimeout(() => setShowTitle(true), 100);
        return () => { clearTimeout(t1); };
    }, []);

    return (
        <Box flexDirection="column" alignItems="center" justifyContent="center" height={8}>
            {showTitle && (
                <BigText
                    text="BluMa CLI"
                    font="block"
                    colors={[BRAND_COLORS.main, BRAND_COLORS.accent, BRAND_COLORS.shadow]}
                />
            )}
        </Box>
    );
};

render(<AnimatedAscii />);