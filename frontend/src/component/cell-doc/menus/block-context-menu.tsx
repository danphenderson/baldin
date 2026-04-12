/**
 * Block-level "⋮" context menu for cell-doc editors.
 *
 * Appears on the left gutter when hovering a top-level block in the
 * ProseMirror document. Provides: Turn into…, Duplicate, Delete,
 * Move up, Move down.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  IconButton, Menu, MenuItem, ListItemIcon, ListItemText,
  Divider, Typography,
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  ContentCopy as DuplicateIcon,
  Delete as DeleteIcon,
  ArrowUpward as MoveUpIcon,
  ArrowDownward as MoveDownIcon,
  SwapHoriz as TurnIntoIcon,
  LockOutlined as LockIcon,
  LockOpenOutlined as UnlockIcon,
} from '@mui/icons-material';
import type { Editor } from '@tiptap/core';
import { moveBlockUp, moveBlockDown } from '../extensions/block-reorder-extension';
import { findBlockNodeById } from '../extensions/block-node-utils';
import type { DocumentShareRole } from '../../../service/documents';

/* ------------------------------------------------------------------ */
/*  Turn-into items                                                    */
/* ------------------------------------------------------------------ */

interface TurnIntoItem {
  label: string;
  command: (editor: Editor) => void;
}

const TURN_INTO_ITEMS: TurnIntoItem[] = [
  { label: 'Paragraph', command: (e) => e.chain().focus().setParagraph().run() },
  { label: 'Heading 1', command: (e) => e.chain().focus().setHeading({ level: 1 }).run() },
  { label: 'Heading 2', command: (e) => e.chain().focus().setHeading({ level: 2 }).run() },
  { label: 'Heading 3', command: (e) => e.chain().focus().setHeading({ level: 3 }).run() },
  { label: 'Bullet List', command: (e) => e.chain().focus().toggleBulletList().run() },
  { label: 'Numbered List', command: (e) => e.chain().focus().toggleOrderedList().run() },
  { label: 'Task List', command: (e) => e.chain().focus().toggleTaskList().run() },
  { label: 'Blockquote', command: (e) => e.chain().focus().toggleBlockquote().run() },
  { label: 'Code Block', command: (e) => e.chain().focus().toggleCodeBlock().run() },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

interface BlockContextMenuProps {
  editor: Editor;
  /** The container element wrapping the ProseMirror editor surface. */
  editorContainerRef: React.RefObject<HTMLElement | null>;
  viewerRole?: DocumentShareRole | null;
}

export const BlockContextMenu: React.FC<BlockContextMenuProps> = ({
  editor,
  editorContainerRef,
  viewerRole = null,
}) => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [turnIntoAnchorEl, setTurnIntoAnchorEl] = useState<HTMLElement | null>(null);
  const [hoveredBlock, setHoveredBlock] = useState<HTMLElement | null>(null);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const isOwner = viewerRole == null;

  /* Track gutter position based on the hovered top-level ProseMirror child */
  useEffect(() => {
    const container = editorContainerRef.current;
    if (!container) return;

    const handleMouseMove = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const prosemirror = container.querySelector('.ProseMirror');
      if (!prosemirror) return;

      const blockElement = target.closest('[data-block-id]') as HTMLElement | null;
      if (blockElement && prosemirror.contains(blockElement)) {
        setHoveredBlock(blockElement);
      }
    };

    const handleMouseLeave = (event: MouseEvent) => {
      const related = event.relatedTarget as HTMLElement | null;
      if (related && buttonRef.current?.contains(related)) return;
      if (anchorEl) return; /* Keep visible while menu is open */
      setHoveredBlock(null);
    };

    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseleave', handleMouseLeave);
    return () => {
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [editorContainerRef, anchorEl]);

  /* Position the cursor inside the hovered block before opening the menu */
  const focusBlock = useCallback(() => {
    const blockId = hoveredBlock?.dataset.blockId;
    if (!blockId) return;

    const match = findBlockNodeById(editor.state.doc, blockId);
    if (!match) return;

    editor.commands.setTextSelection(match.pos + 1);
  }, [editor, hoveredBlock]);

  const handleOpen = useCallback((event: React.MouseEvent<HTMLElement>) => {
    focusBlock();
    setActiveBlockId(hoveredBlock?.dataset.blockId ?? null);
    setAnchorEl(event.currentTarget);
  }, [focusBlock, hoveredBlock?.dataset.blockId]);

  const handleClose = useCallback(() => {
    setAnchorEl(null);
    setTurnIntoAnchorEl(null);
    setActiveBlockId(null);
  }, []);

  const currentBlockMatch = activeBlockId
    ? findBlockNodeById(editor.state.doc, activeBlockId)
    : null;
  const currentBlockLocked = currentBlockMatch?.node.attrs.locked === true;
  const disableMutableActions = currentBlockLocked && !isOwner;

  /* ---- Block operations ---- */

  const handleDuplicate = useCallback(() => {
    if (!currentBlockMatch || disableMutableActions) {
      handleClose();
      return;
    }

    const { pos, node } = currentBlockMatch;
    if (node) {
      editor.chain().focus()
        .insertContentAt(pos + node.nodeSize, node.toJSON())
        .run();
    }
    handleClose();
  }, [currentBlockMatch, disableMutableActions, editor, handleClose]);

  const handleDelete = useCallback(() => {
    if (!currentBlockMatch || disableMutableActions) {
      handleClose();
      return;
    }

    const { pos, node } = currentBlockMatch;
    if (node) {
      editor.chain().focus()
        .deleteRange({ from: pos, to: pos + node.nodeSize })
        .run();
    }
    handleClose();
  }, [currentBlockMatch, disableMutableActions, editor, handleClose]);

  const handleMoveUp = useCallback(() => {
    if (disableMutableActions) {
      handleClose();
      return;
    }
    moveBlockUp(editor);
    handleClose();
  }, [disableMutableActions, editor, handleClose]);

  const handleMoveDown = useCallback(() => {
    if (disableMutableActions) {
      handleClose();
      return;
    }
    moveBlockDown(editor);
    handleClose();
  }, [disableMutableActions, editor, handleClose]);

  const handleTurnInto = useCallback((item: TurnIntoItem) => {
    if (disableMutableActions) {
      handleClose();
      return;
    }
    item.command(editor);
    handleClose();
  }, [disableMutableActions, editor, handleClose]);

  const handleToggleLock = useCallback(() => {
    if (!isOwner || !currentBlockMatch) {
      handleClose();
      return;
    }

    const { pos, node } = currentBlockMatch;
    const nextLocked = node.attrs.locked !== true;
    editor.chain().focus().command(({ tr, dispatch }) => {
      tr.setNodeMarkup(pos, undefined, {
        ...node.attrs,
        locked: nextLocked,
        lockedAt: nextLocked ? new Date().toISOString() : null,
        lockedByUserId: nextLocked ? node.attrs.lockedByUserId ?? null : null,
      }, node.marks);
      dispatch?.(tr.scrollIntoView());
      return true;
    }).run();
    handleClose();
  }, [currentBlockMatch, editor, handleClose, isOwner]);

  /* ---- Gutter button positioning ---- */
  const containerEl = editorContainerRef.current;
  let gutterStyle: React.CSSProperties | undefined;

  if (hoveredBlock && containerEl) {
    const blockRect = hoveredBlock.getBoundingClientRect();
    const containerRect = containerEl.getBoundingClientRect();
    gutterStyle = {
      position: 'absolute',
      top: blockRect.top - containerRect.top + 2,
      left: -36,
      zIndex: 10,
    };
  }

  const showButton = hoveredBlock && editor.isEditable;

  return (
    <>
      {showButton && (
        <IconButton
          ref={buttonRef}
          size="small"
          onClick={handleOpen}
          aria-label="Block actions"
          data-testid="block-context-button"
          sx={{
            ...gutterStyle,
            opacity: 0.5,
            '&:hover': { opacity: 1 },
            width: 28,
            height: 28,
          }}
        >
          <MoreVertIcon fontSize="small" />
        </IconButton>
      )}

      {/* Main menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        slotProps={{ paper: { 'data-testid': 'block-context-menu' } as React.HTMLAttributes<HTMLDivElement> }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      >
        <MenuItem
          onClick={(e) => setTurnIntoAnchorEl(e.currentTarget)}
          aria-label="Turn into"
          disabled={disableMutableActions}
        >
          <ListItemIcon><TurnIntoIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Turn into…</ListItemText>
        </MenuItem>

        {isOwner && (
          <MenuItem onClick={handleToggleLock} aria-label={currentBlockLocked ? 'Unlock block' : 'Lock block'}>
            <ListItemIcon>
              {currentBlockLocked ? <UnlockIcon fontSize="small" /> : <LockIcon fontSize="small" />}
            </ListItemIcon>
            <ListItemText>{currentBlockLocked ? 'Unlock block' : 'Lock block'}</ListItemText>
          </MenuItem>
        )}

        <Divider />

        <MenuItem onClick={handleDuplicate} aria-label="Duplicate block" disabled={disableMutableActions}>
          <ListItemIcon><DuplicateIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Duplicate</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleDelete} aria-label="Delete block" disabled={disableMutableActions}>
          <ListItemIcon><DeleteIcon fontSize="small" color="error" /></ListItemIcon>
          <ListItemText>
            <Typography color="error">Delete</Typography>
          </ListItemText>
        </MenuItem>

        <Divider />

        <MenuItem onClick={handleMoveUp} aria-label="Move block up" disabled={disableMutableActions}>
          <ListItemIcon><MoveUpIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Move up</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleMoveDown} aria-label="Move block down" disabled={disableMutableActions}>
          <ListItemIcon><MoveDownIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Move down</ListItemText>
        </MenuItem>
      </Menu>

      {/* Turn into submenu */}
      <Menu
        anchorEl={turnIntoAnchorEl}
        open={Boolean(turnIntoAnchorEl)}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{ paper: { 'data-testid': 'turn-into-menu' } as React.HTMLAttributes<HTMLDivElement> }}
      >
        {TURN_INTO_ITEMS.map((item) => (
          <MenuItem
            key={item.label}
            onClick={() => handleTurnInto(item)}
            aria-label={`Turn into ${item.label}`}
          >
            <ListItemText>{item.label}</ListItemText>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};
