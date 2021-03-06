WINDOW_HEIGHT = 650
WINDOW_WIDTH = 1000
WINDOW_TITLE = "Celestial"

CELL_WIDTH, CELL_HEIGHT = 100, 100
CELL_WIDTH_HALF, CELL_HEIGHT_HALF = CELL_WIDTH / 2, CELL_HEIGHT / 2
WIDTH_BETWEEN = 20
HEIGHT_BETWEEN = 20

CARDS_PER_ROW = 8
CARDS_PER_COL = 4
CARDS_PER_PAGE = CARDS_PER_ROW * CARDS_PER_COL

BAR_HEIGHT = 10
BAR_COLOR = 200, 20, 20, 100

STACK_HEIGHT = WINDOW_HEIGHT / 2
# The offset of cards up/down from middle based on which player played them
STACK_OFFSET = 30
STACK_OVERLAP = 40

TEXT_SIZE = 36
TEXT_WIDTH = 4 * CELL_WIDTH
RECAP_TEXT_WIDTH = CELL_WIDTH - STACK_OVERLAP

DECK_HEIGHT = CELL_HEIGHT + 2 * HEIGHT_BETWEEN + STACK_OFFSET
MAX_DECK_SIZE = 15

# Time for pages to flip in sec
TRANSITION_TIME = 0.15

BACKGROUND_COLOR = 64, 64, 224, 100
NO_COLOR = 0, 0, 0, 0

STATUS_COLOR = 0, 224, 0, 224

# Specific to game view
PILE_POS = (WINDOW_WIDTH - WIDTH_BETWEEN - CELL_WIDTH / 2,
            2 * CELL_HEIGHT)
DECK_POS = (PILE_POS[0] - WIDTH_BETWEEN - CELL_WIDTH,
            PILE_POS[1])
OPP_PILE_POS = (PILE_POS[0], WINDOW_HEIGHT - PILE_POS[1])
OPP_DECK_POS = (DECK_POS[0], WINDOW_HEIGHT - DECK_POS[1])

PLAYER_SIDE_POSITION = WINDOW_WIDTH / 2, DECK_POS[1]
OPPONENT_SIDE_POSITION = PLAYER_SIDE_POSITION[0], OPP_DECK_POS[1]
PLAYER_TEXT_COLOR = (0, 180, 100, 255)
HIGHLIGHT_COLOR = BAR_COLOR
HIGHLIGHT_WIDTH = CELL_WIDTH
HIGHLIGHT_HEIGHT = CELL_HEIGHT + 20

UNPLAYABLE_CARD_COLOR = (160, 160, 160)
PILE_HIGHLIGHT_COLOR = (160, 255, 160)
